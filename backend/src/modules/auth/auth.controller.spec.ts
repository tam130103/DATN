import { UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Request, Response } from 'express';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';

describe('AuthController.googleRedirect', () => {
  let controller: AuthController;
  let authService: jest.Mocked<AuthService>;

  const createResponse = () =>
    ({
      redirect: jest.fn(),
    }) as unknown as Response;

  beforeEach(() => {
    authService = {
      register: jest.fn(),
      login: jest.fn(),
      googleLogin: jest.fn(),
      refreshTokens: jest.fn(),
    } as unknown as jest.Mocked<AuthService>;

    controller = new AuthController(
      authService,
      {
        get: jest.fn((_key: string, fallback?: string) => fallback ?? 'http://localhost:5173'),
      } as unknown as ConfigService,
    );
  });

  it('redirects back to login when the csrf token is invalid', async () => {
    const res = createResponse();

    await controller.googleRedirect(
      { credential: 'token', g_csrf_token: 'body-token' },
      { headers: { cookie: 'g_csrf_token=cookie-token' } } as Request,
      res,
    );

    expect((res as any).redirect).toHaveBeenCalledWith(
      303,
      'http://localhost:5173/login?google_error=Xac+thuc+Google+khong+hop+le.+Vui+long+thu+lai.',
    );
    expect(authService.googleLogin).not.toHaveBeenCalled();
  });

  it('redirects to the frontend callback route when google login succeeds', async () => {
    const res = createResponse();
    authService.googleLogin.mockResolvedValue({
      accessToken: 'access-token',
      refreshToken: 'refresh-token',
    } as any);

    await controller.googleRedirect(
      { credential: 'token', g_csrf_token: 'same-token' },
      { headers: { cookie: 'g_csrf_token=same-token' } } as Request,
      res,
    );

    expect(authService.googleLogin).toHaveBeenCalledWith('token');
    expect((res as any).redirect).toHaveBeenCalledWith(
      303,
      'http://localhost:5173/auth/google/callback#accessToken=access-token&refreshToken=refresh-token',
    );
  });

  it('redirects with the backend error message when google login fails', async () => {
    const res = createResponse();
    authService.googleLogin.mockRejectedValue(new UnauthorizedException('Invalid Google token'));

    await controller.googleRedirect(
      { credential: 'token', g_csrf_token: 'same-token' },
      { headers: { cookie: 'g_csrf_token=same-token' } } as Request,
      res,
    );

    expect((res as any).redirect).toHaveBeenCalledWith(
      303,
      'http://localhost:5173/login?google_error=Invalid+Google+token',
    );
  });
});
