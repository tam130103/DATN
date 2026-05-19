import { UnauthorizedException } from '@nestjs/common';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';

const createResponseMock = () => ({
  cookie: jest.fn(),
  clearCookie: jest.fn(),
});

describe('AuthController refresh token cookies', () => {
  const authService = {
    login: jest.fn(),
    register: jest.fn(),
    googleLogin: jest.fn(),
    refreshTokens: jest.fn(),
  } as unknown as jest.Mocked<AuthService>;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('sets refresh token in an httpOnly cookie and omits it from login response body', async () => {
    const controller = new AuthController(authService);
    const response = createResponseMock();

    authService.login.mockResolvedValue({
      user: { id: 'user-1' } as any,
      accessToken: 'access-token',
      refreshToken: 'refresh-token',
    });

    const result = await (controller as any).login(
      { email: 'user@example.com', password: 'secret' },
      response,
    );

    expect(response.cookie).toHaveBeenCalledWith(
      'refreshToken',
      'refresh-token',
      expect.objectContaining({ httpOnly: true }),
    );
    expect(result).toEqual({ user: { id: 'user-1' }, accessToken: 'access-token' });
  });

  it('refreshes from the cookie when request body does not include a refresh token', async () => {
    const controller = new AuthController(authService);

    authService.refreshTokens.mockResolvedValue({ accessToken: 'new-access' });

    await expect(
      (controller as any).refresh(undefined, {
        headers: { cookie: 'refreshToken=cookie-refresh' },
      }),
    ).resolves.toEqual({ accessToken: 'new-access' });

    expect(authService.refreshTokens).toHaveBeenCalledWith('cookie-refresh');
  });

  it('rejects refresh requests without body token or cookie token', async () => {
    const controller = new AuthController(authService);

    await expect((controller as any).refresh(undefined, { headers: {} })).rejects.toThrow(
      UnauthorizedException,
    );
  });
});
