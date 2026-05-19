import {
  Controller,
  Post,
  Body,
  Get,
  UseGuards,
  Res,
  Req,
  UnauthorizedException,
  HttpCode,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { Throttle } from '@nestjs/throttler';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { CurrentUser, RequestUser } from './decorators/current-user.decorator';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';

const REFRESH_COOKIE_NAME = 'refreshToken';
const REFRESH_COOKIE_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  private getRefreshCookieOptions() {
    const sameSite =
      (process.env.REFRESH_COOKIE_SAMESITE as 'lax' | 'strict' | 'none' | undefined) ??
      (process.env.NODE_ENV === 'production' ? 'none' : 'lax');

    return {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production' || sameSite === 'none',
      sameSite,
      path: '/',
      maxAge: REFRESH_COOKIE_MAX_AGE_MS,
    } as const;
  }

  private setRefreshCookie(response: Response, refreshToken: string) {
    response.cookie(REFRESH_COOKIE_NAME, refreshToken, this.getRefreshCookieOptions());
  }

  private clearRefreshCookie(response: Response) {
    const { maxAge: _maxAge, ...options } = this.getRefreshCookieOptions();
    response.clearCookie(REFRESH_COOKIE_NAME, {
      ...options,
    });
  }

  private getRefreshTokenFromCookie(request: Request): string | undefined {
    const cookieHeader = request.headers.cookie;
    if (!cookieHeader) {
      return undefined;
    }

    return cookieHeader
      .split(';')
      .map((part) => part.trim())
      .map((part) => {
        const separatorIndex = part.indexOf('=');
        return separatorIndex === -1
          ? [part, '']
          : [part.slice(0, separatorIndex), part.slice(separatorIndex + 1)];
      })
      .find(([name]) => name === REFRESH_COOKIE_NAME)?.[1];
  }

  private toAuthResponse<T extends { refreshToken: string }>(
    result: T,
    response: Response,
  ): Omit<T, 'refreshToken'> {
    this.setRefreshCookie(response, result.refreshToken);
    const { refreshToken: _refreshToken, ...body } = result;
    return body;
  }

  @Post('register')
  @Throttle({ default: { limit: 8, ttl: 60000 } })
  async register(@Body() registerDto: RegisterDto, @Res({ passthrough: true }) response: Response) {
    return this.toAuthResponse(await this.authService.register(registerDto), response);
  }

  @Post('login')
  @Throttle({ default: { limit: 8, ttl: 60000 } })
  async login(@Body() loginDto: LoginDto, @Res({ passthrough: true }) response: Response) {
    return this.toAuthResponse(await this.authService.login(loginDto), response);
  }

  @Post('google')
  @Throttle({ default: { limit: 12, ttl: 60000 } })
  async googleAuth(@Body('idToken') idToken: string, @Res({ passthrough: true }) response: Response) {
    return this.toAuthResponse(await this.authService.googleLogin(idToken), response);
  }

  @Post('refresh')
  @Throttle({ default: { limit: 30, ttl: 60000 } })
  async refresh(@Body('refreshToken') refreshToken: string | undefined, @Req() request: Request) {
    const token = refreshToken || this.getRefreshTokenFromCookie(request);
    if (!token) {
      throw new UnauthorizedException('Missing refresh token');
    }

    return this.authService.refreshTokens(decodeURIComponent(token));
  }

  @Post('logout')
  @HttpCode(204)
  logout(@Res({ passthrough: true }) response: Response) {
    this.clearRefreshCookie(response);
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  getCurrentUser(@CurrentUser() user: RequestUser) {
    return user;
  }
}
