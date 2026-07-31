import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { UPLOADS_DIR } from './uploads/uploads.constants';

async function bootstrap() {
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
