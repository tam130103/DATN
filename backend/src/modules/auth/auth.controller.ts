import {
  Body,
  Controller,
  Get,
  HttpException,
  Post,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Request, Response } from 'express';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { CurrentUser } from './decorators/current-user.decorator';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly configService: ConfigService,
  ) {}

  private parseCookies(req: Request) {
    const cookieHeader = req.headers.cookie;
    if (!cookieHeader) {
      return {};
    }

    return cookieHeader.split(';').reduce<Record<string, string>>((accumulator, entry) => {
      const [name, ...rest] = entry.trim().split('=');
      if (!name || rest.length === 0) {
        return accumulator;
      }

      accumulator[name] = decodeURIComponent(rest.join('='));
      return accumulator;
    }, {});
  }

  private getFrontendUrl() {
    return (
      this.configService.get<string>('FRONTEND_URL', 'http://localhost:5173').replace(/\/+$/, '')
    );
  }

  private redirectWithError(res: Response, message: string) {
    const redirectUrl = new URL('/login', this.getFrontendUrl());
    redirectUrl.searchParams.set('google_error', message);
    return res.redirect(303, redirectUrl.toString());
  }

  @Post('register')
  async register(@Body() registerDto: RegisterDto) {
    return this.authService.register(registerDto);
  }

  @Post('login')
  async login(@Body() loginDto: LoginDto) {
    return this.authService.login(loginDto);
  }

  @Post('google')
  async googleAuth(@Body('idToken') idToken: string) {
    return this.authService.googleLogin(idToken);
  }

  @Post('google/redirect')
  async googleRedirect(
    @Body() body: Record<string, string> | undefined,
    @Req() req: Request,
    @Res() res: Response,
  ) {
    const credential = typeof body?.credential === 'string' ? body.credential : '';
    const csrfBody = typeof body?.g_csrf_token === 'string' ? body.g_csrf_token : '';
    const csrfCookie = this.parseCookies(req).g_csrf_token;

    if (!csrfCookie || !csrfBody || csrfCookie !== csrfBody) {
      return this.redirectWithError(res, 'Xac thuc Google khong hop le. Vui long thu lai.');
    }

    if (!credential) {
      return this.redirectWithError(res, 'Khong nhan duoc thong tin dang nhap Google.');
    }

    try {
      const response = await this.authService.googleLogin(credential);
      const redirectUrl = new URL('/auth/google/callback', this.getFrontendUrl());
      const fragment = new URLSearchParams({
        accessToken: response.accessToken,
        refreshToken: response.refreshToken,
      }).toString();

      return res.redirect(303, `${redirectUrl.toString()}#${fragment}`);
    } catch (error) {
      if (error instanceof HttpException) {
        const payload = error.getResponse();
        const message = Array.isArray((payload as any)?.message)
          ? (payload as any).message[0]
          : typeof (payload as any)?.message === 'string'
            ? (payload as any).message
            : error.message;

        return this.redirectWithError(res, message || 'Dang nhap Google that bai.');
      }

      return this.redirectWithError(res, 'Dang nhap Google that bai.');
    }
  }

  @Post('refresh')
  async refresh(@Body('refreshToken') refreshToken: string) {
    return this.authService.refreshTokens(refreshToken);
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  getCurrentUser(@CurrentUser() user: any) {
    return user;
  }
}
