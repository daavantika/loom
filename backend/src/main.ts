import 'reflect-metadata';
import { execFileSync } from 'child_process';
import { join } from 'path';
import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { UPLOADS_DIR } from './uploads/uploads.constants';

const BACKEND_ROOT = join(__dirname, '..');

/**
 * Runs pending migrations against both databases, and — if SEED_ADMIN_EMAIL/
 * SEED_ADMIN_PASSWORD are set — seeds/updates the admin account, all by
 * shelling out to a single `npm run boot:prepare` (scripts/boot-prepare.ts)
 * rather than calling DataSource.runMigrations()/upsertAdmin() in-process.
 * Migration files under migrations/ are plain .ts, deliberately excluded
 * from the tsc build (tsconfig.json's rootDir is src/, "migrations" is in
 * its exclude list), so loading them needs ts-node; boot-prepare.ts is run
 * via ts-node in its OWN process for exactly that reason. Registering
 * ts-node in-process here instead was tried and rejected: it pulls in
 * source-map-support, which — when the running file is already-compiled,
 * sourcemapped dist/main.js — resolves subsequent requires against the
 * *source* paths instead of dist/, breaking `./app.module`. This used to be
 * three separate shell-outs (migration:run:user, migration:run:admin,
 * seed:admin), each paying its own ts-node cold-start cost — on Render free
 * tier's throttled CPU that made a cold start (after the instance spins
 * down from inactivity) take 2+ minutes. Consolidated into one script/one
 * process to cut that down. Needed at all because Render's free tier
 * supports neither preDeployCommand nor Shell access (both confirmed
 * paid-only), so there's no separate step to run this; doing it here is
 * safe on every boot since TypeORM tracks already-applied migrations and
 * skips them, and admin upsert is idempotent.
 */
function prepareDatabase(): void {
  execFileSync('npm', ['run', 'boot:prepare'], { cwd: BACKEND_ROOT, stdio: 'inherit' });
}

async function bootstrap() {
  prepareDatabase();

  // rawBody: true preserves req.rawBody alongside the parsed body — Express's
  // default JSON parser consumes the raw bytes, but the Razorpay webhook
  // handler needs the exact bytes Razorpay signed to verify the HMAC.
  const app = await NestFactory.create<NestExpressApplication>(AppModule, { rawBody: true });
  // The frontend (Vite dev server, and later a real hosted domain) is always
  // a different origin from this API — no same-origin deployment is planned.
  app.enableCors();
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true, forbidNonWhitelisted: true }));
  // Serves uploaded files back at /uploads/<filename> — plain Express static
  // serving (bundled with @nestjs/platform-express), not the separate
  // @nestjs/serve-static package (that one targets SPA/Fastify hosting with
  // an index.html fallback we don't need here).
  app.useStaticAssets(UPLOADS_DIR, { prefix: '/uploads' });

  const config = new DocumentBuilder()
    .setTitle('LOOM Cook Backend')
    .setDescription('Cook-side API for the LOOM marketplace (Phase 1: onboarding & verification)')
    .setVersion('0.1.0')
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api', app, document);

  const configService = app.get(ConfigService);
  const port = configService.get<number>('PORT', 3000);
  await app.listen(port);
  console.log(`LOOM backend listening on :${port} — docs at /api`);
}

bootstrap();
