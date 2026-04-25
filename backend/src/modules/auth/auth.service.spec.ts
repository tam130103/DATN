import { UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import axios from 'axios';
import { AuthService } from './auth.service';
import { UserService } from '../user/user.service';

jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('AuthService.googleLogin', () => {
  let service: AuthService;
  let userService: jest.Mocked<UserService>;
  let jwtService: jest.Mocked<JwtService>;
  let configService: ConfigService;

  beforeEach(() => {
    jest.clearAllMocks();

    userService = {
      findOrCreateByGoogle: jest.fn(),
    } as unknown as jest.Mocked<UserService>;

    jwtService = {
      sign: jest.fn(),
    } as unknown as jest.Mocked<JwtService>;

    configService = {
      get: jest.fn((key: string) => {
        if (key === 'GOOGLE_CLIENT_ID') {
          return 'google-client-id';
        }
        if (key === 'JWT_REFRESH_SECRET') {
          return 'refresh-secret';
        }
        if (key === 'JWT_SECRET') {
          return 'jwt-secret';
        }
        return undefined;
      }),
    } as unknown as ConfigService;

    service = new AuthService(userService, jwtService, configService);
  });

  it('rejects google tokens for unverified emails', async () => {
    mockedAxios.get.mockResolvedValue({
      data: {
        sub: 'google-1',
        email: 'user@example.com',
        name: 'User',
        aud: 'google-client-id',
        email_verified: 'false',
      },
    } as any);

    await expect(service.googleLogin('token')).rejects.toThrow(UnauthorizedException);
    expect(userService.findOrCreateByGoogle).not.toHaveBeenCalled();
  });

  it('rejects google tokens issued for another client id', async () => {
    mockedAxios.get.mockResolvedValue({
      data: {
        sub: 'google-1',
        email: 'user@example.com',
        name: 'User',
        aud: 'different-client-id',
        email_verified: 'true',
      },
    } as any);

    await expect(service.googleLogin('token')).rejects.toThrow('Invalid Google token');
    expect(userService.findOrCreateByGoogle).not.toHaveBeenCalled();
  });

  it('creates a session when the google token is valid', async () => {
    mockedAxios.get.mockResolvedValue({
      data: {
        sub: 'google-1',
        email: 'user@example.com',
        name: 'User',
        picture: 'https://example.com/avatar.jpg',
        aud: 'google-client-id',
        email_verified: 'true',
      },
    } as any);
    userService.findOrCreateByGoogle.mockResolvedValue({
      id: 'user-1',
      email: 'user@example.com',
    } as any);
    jwtService.sign
      .mockReturnValueOnce('access-token')
      .mockReturnValueOnce('refresh-token');

    const result = await service.googleLogin('token');

    expect(userService.findOrCreateByGoogle).toHaveBeenCalledWith(
      'google-1',
      'user@example.com',
      'User',
      'https://example.com/avatar.jpg',
    );
    expect(result).toMatchObject({
      accessToken: 'access-token',
      refreshToken: 'refresh-token',
      user: {
        id: 'user-1',
        email: 'user@example.com',
      },
    });
  });
});
