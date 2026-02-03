import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  const configService = app.get(ConfigService);
  const port = configService.get<number>('PORT', 3000);
  const frontendUrl = configService.get<string>('FRONTEND_URL', 'http://localhost:5173');

  // Global prefix
  app.setGlobalPrefix(configService.get<string>('API_PREFIX', 'api/v1'));

  // CORS
  app.enableCors({
    origin: frontendUrl,
    credentials: true,
  });

  // Validation
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  );

  await app.listen(port);
  console.log(`🚀 Backend running on: http://localhost:${port}`);
  console.log(`📡 API endpoint: http://localhost:${port}/${configService.get<string>('API_PREFIX', 'api/v1')}`);
}
bootstrap();
