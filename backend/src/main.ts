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
 * Runs pending migrations against both databases at boot, by shelling out
 * to the exact same `npm run migration:run` used locally/in CI — not by
 * calling DataSource.runMigrations() in-process. Migration files under
 * migrations/ are plain .ts, deliberately excluded from the tsc build
 * (tsconfig.json's rootDir is src/, "migrations" is in its exclude list),
 * so loading them needs ts-node; `npm run migration:run` already handles
 * that correctly via `typeorm-ts-node-commonjs` in its OWN process.
 * Registering ts-node in-process here instead was tried and rejected: it
 * pulls in source-map-support, which — when the running file is already-
 * compiled, sourcemapped dist/main.js — resolves subsequent requires
 * against the *source* paths instead of dist/, breaking `./app.module`.
 * Needed at all because Render's free tier supports neither
 * preDeployCommand nor Shell access (both confirmed paid-only), so there's
 * no separate step to run this; doing it here is safe on every boot since
 * TypeORM tracks already-applied migrations and skips them.
 */
function runStartupMigrations(): void {
  execFileSync('npm', ['run', 'migration:run'], { cwd: BACKEND_ROOT, stdio: 'inherit' });
}

/**
 * Optional, idempotent convenience: if both SEED_ADMIN_EMAIL and
 * SEED_ADMIN_PASSWORD are set, ensures that admin account exists — same
 * reason as runStartupMigrations(): no Shell access on Render's free tier
 * to run scripts/seed-admin.ts manually. Leave both unset to skip (the
 * default), matching this codebase's existing "unset = skip" convention
 * for every other optional integration (Razorpay/Gemini/Porter/Supabase).
 *
 * Shells out to the same scripts/seed-admin.ts used for manual/local runs
 * rather than importing AdminDataSource in-process: TypeORM's
 * DataSource.initialize() eagerly resolves the `migrations` glob on its
 * config (raw .ts files under migrations/admin-db/) even when
 * .runMigrations() is never called, hitting the exact same "no ts-node in
 * this process" problem runStartupMigrations() above already had to work
 * around. execFileSync (not execSync) so the email/password — real,
 * operator-supplied values, not fixed literals — are passed as argv, never
 * interpolated through a shell.
 */
function seedAdminIfConfigured(): void {
  const email = process.env.SEED_ADMIN_EMAIL || undefined;
  const password = process.env.SEED_ADMIN_PASSWORD || undefined;
  if (!email || !password) return;

  execFileSync('npm', ['run', 'seed:admin', '--', email, password], { cwd: BACKEND_ROOT, stdio: 'inherit' });
}

async function bootstrap() {
  runStartupMigrations();
  await seedAdminIfConfigured();

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
