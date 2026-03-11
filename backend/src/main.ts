import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestExpressApplication } from '@nestjs/platform-express';
import { existsSync, mkdirSync } from 'fs';
import { isAbsolute, join } from 'path';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  const configService = app.get(ConfigService);
  const port = configService.get<number>('PORT', 3000);
  const frontendUrl = configService.get<string>('FRONTEND_URL', 'http://localhost:5173');
  const uploadDirValue = configService.get<string>('UPLOAD_DIR', 'uploads');
  const uploadDir = isAbsolute(uploadDirValue)
    ? uploadDirValue
    : join(process.cwd(), uploadDirValue);

  if (!existsSync(uploadDir)) {
    mkdirSync(uploadDir, { recursive: true });
  }

  app.setGlobalPrefix(configService.get<string>('API_PREFIX', 'api/v1'));

  app.enableCors({
    origin: frontendUrl,
    credentials: true,
  });

  app.useStaticAssets(uploadDir, {
    prefix: '/uploads/',
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
