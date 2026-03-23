import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { join } from 'path';
import { existsSync, mkdirSync } from 'fs';
import * as express from 'express';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { rawBody: true });

  const configService = app.get(ConfigService);
  const port = configService.get<number>('PORT', 3000);
  const frontendUrl = configService.get<string>('FRONTEND_URL', 'http://localhost:5173');

  const uploadDir = join(process.cwd(), configService.get<string>('UPLOAD_DIR', 'uploads'));
  if (!existsSync(uploadDir)) {
    mkdirSync(uploadDir, { recursive: true });
  }
  app.use('/uploads', express.static(uploadDir));

  app.setGlobalPrefix(configService.get<string>('API_PREFIX', 'api/v1'));

  app.enableCors({
    origin: (origin, callback) => {
      if (!origin) return callback(null, true);
      
      const allowedOrigins = [
        frontendUrl,
        'https://datn-mu-six.vercel.app',
        /^https:\/\/.*\.vercel\.app$/,
        /^http:\/\/localhost:\d+$/,
        /^http:\/\/127\.0\.0\.1:\d+$/
      ];

      const isAllowed = allowedOrigins.some((o) =>
        typeof o === 'string' ? o === origin : o.test(origin),
      );

      if (isAllowed) {
        callback(null, true);
      } else {
        console.error(`CORS blocked for origin: ${origin}`);
        callback(new Error('Not allowed by CORS'), false);
      }
    },
    credentials: true,
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  );

  await app.listen(port);
  console.log(`Backend running on: http://localhost:${port}`);
  console.log(`API endpoint: http://localhost:${port}/${configService.get<string>('API_PREFIX', 'api/v1')}`);
}
bootstrap();
