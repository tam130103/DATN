import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { join } from 'path';
import { existsSync, mkdirSync } from 'fs';
import * as express from 'express';
import { AppModule } from './app.module';
import { createCorsOriginValidator } from './common/cors.util';
import helmet from 'helmet';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { rawBody: true });

  // Security headers
  app.use(helmet());
  app.use(helmet.crossOriginResourcePolicy({ policy: "cross-origin" })); // Allow serving static images to frontend

  const configService = app.get(ConfigService);
  const port = configService.get<number>('PORT', 3000);
  const frontendUrl = configService.get<string>('FRONTEND_URL', 'http://localhost:5173');

  const uploadDir = join(process.cwd(), configService.get<string>('UPLOAD_DIR', 'uploads'));
  if (!existsSync(uploadDir)) {
    mkdirSync(uploadDir, { recursive: true });
  }
  app.use('/uploads', express.static(uploadDir));

  // Health check endpoint — outside global prefix so UptimeRobot can ping at /health
  app.use('/health', (_req: express.Request, res: express.Response) => {
    res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  app.setGlobalPrefix(configService.get<string>('API_PREFIX', 'api/v1'));

  app.enableCors({
    origin: createCorsOriginValidator(() => frontendUrl),
    credentials: true,
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  );

  // Swagger API Documentation setup
  const swaggerConfig = new DocumentBuilder()
    .setTitle('DATN Social API')
    .setDescription('The API description for DATN Social project')
    .setVersion('1.0')
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('api/docs', app, document);

  await app.listen(port);
  console.log(`Backend running on: http://localhost:${port}`);
  console.log(`API endpoint: http://localhost:${port}/${configService.get<string>('API_PREFIX', 'api/v1')}`);
}
bootstrap();
