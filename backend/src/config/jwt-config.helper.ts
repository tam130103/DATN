import { ConfigService } from '@nestjs/config';

export function getJwtSecret(configService: ConfigService): string {
  const secret = configService.get<string>('JWT_SECRET');
  if (!secret) {
    throw new Error('JWT_SECRET is not configured in environment variables');
  }
  return secret;
}

export function getJwtRefreshSecret(configService: ConfigService): string {
  const secret = configService.get<string>('JWT_REFRESH_SECRET');
  if (!secret) {
    throw new Error('JWT_REFRESH_SECRET is not configured in environment variables');
  }
  return secret;
}
