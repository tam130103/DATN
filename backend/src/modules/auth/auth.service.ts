import { Injectable, UnauthorizedException, ConflictException, BadRequestException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { UserService } from '../user/user.service';
import { User, UserProvider, UserStatus } from '../user/entities/user.entity';
import { OAuth2Client } from 'google-auth-library';
import * as bcrypt from 'bcrypt';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { getJwtRefreshSecret } from '../../config/jwt-config.helper';

@Injectable()
export class AuthService {
  private readonly googleClient: OAuth2Client;

  constructor(
    private readonly userService: UserService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {
    this.googleClient = new OAuth2Client();
  }

  async googleLogin(idToken: string) {
    // Verify Google token
    const googleUser = await this.verifyGoogleToken(idToken);
    if (!googleUser) {
      throw new UnauthorizedException('Invalid Google token');
    }

    // Find or create user
    const user = await this.userService.findOrCreateByGoogle(
      googleUser.sub,
      googleUser.email!,
      googleUser.name,
      googleUser.picture,
    );

    if (user.status === UserStatus.BLOCKED) {
      throw new UnauthorizedException('Tài khoản của bạn đã bị khóa.');
    }

    // Generate tokens
    const accessToken = this.generateAccessToken(user.id, user.email);
    const refreshToken = this.generateRefreshToken(user.id);
    const safeUser = this.sanitizeUser(user);

    return { user: safeUser, accessToken, refreshToken };
  }

  async register(registerDto: RegisterDto) {
    const { email, password, name } = registerDto;

    // Check if user exists
    const existingUser = await this.userService.findByEmail(email);
    if (existingUser) {
      throw new ConflictException('Email already registered');
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Generate a default username if not provided (Local auth usually doesn't provide one initially)
    const baseUsername = email.split('@')[0].toLowerCase().replace(/[^a-z0-9]/g, '');
    const username = `${baseUsername}_${Math.floor(Math.random() * 10000)}`;

    // Create user with provider='local'
    const user = await this.userService.create({
      email,
      username,
      password: hashedPassword,
      name: name || email.split('@')[0],
      provider: UserProvider.LOCAL,
    });

    // Generate tokens
    const accessToken = this.generateAccessToken(user.id, user.email);
    const refreshToken = this.generateRefreshToken(user.id);

    const safeUser = this.sanitizeUser(user);

    return { user: safeUser, accessToken, refreshToken };
  }

  async login(loginDto: LoginDto) {
    const { email: identifier, password } = loginDto;
    const normalized = identifier.trim();
    const lower = normalized.toLowerCase();

    let user: User | null = null;

    if (normalized.includes('@')) {
      user = (await this.userService.findByEmail(normalized)) ?? (await this.userService.findByEmail(lower));
    } else {
      user = (await this.userService.findByUsername(normalized)) ?? (await this.userService.findByUsername(lower));
      if (!user) {
        user = (await this.userService.findByEmail(normalized)) ?? (await this.userService.findByEmail(lower));
      }
    }

    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // Check if user is local provider (treat null as local)
    if (user.provider && user.provider !== UserProvider.LOCAL) {
      throw new BadRequestException('Please use Google OAuth to login');
    }

    // Verify password
    if (!user.password) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    if (user.status === UserStatus.BLOCKED) {
      throw new UnauthorizedException('Tài khoản của bạn đã bị khóa.');
    }

    // Generate tokens
    const accessToken = this.generateAccessToken(user.id, user.email);
    const refreshToken = this.generateRefreshToken(user.id);

    const safeUser = this.sanitizeUser(user);

    return { user: safeUser, accessToken, refreshToken };
  }

  async refreshTokens(refreshToken: string) {
    try {
      const secret = getJwtRefreshSecret(this.configService);
      const payload = this.jwtService.verify(refreshToken, { secret });
      const user = await this.userService.findById(payload.sub);
      if (user.status === UserStatus.BLOCKED) {
        throw new UnauthorizedException('Tài khoản của bạn đã bị khóa.');
      }
      const accessToken = this.generateAccessToken(user.id, user.email);
      return { accessToken };
    } catch (err) {
      if (err instanceof UnauthorizedException) throw err;
      throw new UnauthorizedException('Invalid refresh token');
    }
  }

  async validateUser(userId: string) {
    return this.userService.findById(userId);
  }

  private async verifyGoogleToken(idToken: string) {
    const googleClientId = this.configService.get<string>('GOOGLE_CLIENT_ID');
    if (!googleClientId) {
      if (this.configService.get('NODE_ENV') === 'production') {
        throw new Error('GOOGLE_CLIENT_ID is required in production');
      }
      return null;
    }

    try {
      const ticket = await this.googleClient.verifyIdToken({
        idToken,
        audience: googleClientId,
      });
      const payload = ticket.getPayload();
      if (!payload || !payload.sub || !payload.email || payload.email_verified !== true) {
        return null;
      }
      return payload;
    } catch {
      return null;
    }
  }

  private generateAccessToken(userId: string, email: string): string {
    return this.jwtService.sign({ sub: userId, email });
  }

  private generateRefreshToken(userId: string): string {
    const secret = getJwtRefreshSecret(this.configService);
    return this.jwtService.sign({ sub: userId }, { secret, expiresIn: '7d' });
  }

  private sanitizeUser(user: User): Omit<User, 'password' | 'googleId' | 'blockedReason' | 'blockedAt' | 'toJSON'> {
    const {
      password: _password,
      googleId: _googleId,
      blockedReason: _blockedReason,
      blockedAt: _blockedAt,
      ...safeUser
    } = user;
    return safeUser;
  }
}
