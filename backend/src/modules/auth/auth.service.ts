import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { UserService } from '../user/user.service';
import axios from 'axios';

@Injectable()
export class AuthService {
  constructor(
    private readonly userService: UserService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  async googleLogin(idToken: string) {
    // Verify Google token
    const googleUser = await this.verifyGoogleToken(idToken);
    if (!googleUser) {
      throw new UnauthorizedException('Invalid Google token');
    }

    // Find or create user
    const user = await this.userService.findOrCreateByGoogle(
      googleUser.sub,
      googleUser.email,
      googleUser.name,
      googleUser.picture,
    );

    // Generate tokens
    const accessToken = this.generateAccessToken(user.id, user.email);
    const refreshToken = this.generateRefreshToken(user.id);

    return { user, accessToken, refreshToken };
  }

  async refreshTokens(refreshToken: string) {
    try {
      const payload = this.jwtService.verify(refreshToken, {
        secret: this.configService.get<string>('JWT_REFRESH_SECRET') || this.configService.get<string>('JWT_SECRET'),
      });
      const user = await this.userService.findById(payload.sub);
      const accessToken = this.generateAccessToken(user.id, user.email);
      return { accessToken };
    } catch {
      throw new UnauthorizedException('Invalid refresh token');
    }
  }

  async validateUser(userId: string) {
    return this.userService.findById(userId);
  }

  private async verifyGoogleToken(idToken: string) {
    try {
      const response = await axios.get(`https://oauth2.googleapis.com/tokeninfo?id_token=${idToken}`);
      return response.data;
    } catch {
      return null;
    }
  }

  private generateAccessToken(userId: string, email: string): string {
    return this.jwtService.sign({ sub: userId, email });
  }

  private generateRefreshToken(userId: string): string {
    const secret = this.configService.get<string>('JWT_REFRESH_SECRET') || this.configService.get<string>('JWT_SECRET');
    return this.jwtService.sign({ sub: userId }, { secret, expiresIn: '7d' });
  }
}
