import { Injectable, UnauthorizedException, ConflictException, BadRequestException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { UserService } from '../user/user.service';
import { User, UserProvider } from '../user/entities/user.entity';
import axios from 'axios';
import * as bcrypt from 'bcrypt';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';

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

  async register(registerDto: RegisterDto) {
    const { email, password, name } = registerDto;

    // Check if user exists
    const existingUser = await this.userService.findByEmail(email);
    if (existingUser) {
      throw new ConflictException('Email already registered');
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create user with provider='local'
    const user = await this.userService.create({
      email,
      password: hashedPassword,
      name: name || email.split('@')[0],
      provider: UserProvider.LOCAL,
    });

    // Generate tokens
    const accessToken = this.generateAccessToken(user.id, user.email);
    const refreshToken = this.generateRefreshToken(user.id);

    // Remove password from response
    const { password: _, ...userWithoutPassword } = user as any;

    return { user: userWithoutPassword, accessToken, refreshToken };
  }

  async login(loginDto: LoginDto) {
    const { email, password } = loginDto;

    // Find user by email
    const user = await this.userService.findByEmail(email);
    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // Check if user is local provider
    if (user.provider !== UserProvider.LOCAL) {
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

    // Generate tokens
    const accessToken = this.generateAccessToken(user.id, user.email);
    const refreshToken = this.generateRefreshToken(user.id);

    // Remove password from response
    const { password: _, ...userWithoutPassword } = user as any;

    return { user: userWithoutPassword, accessToken, refreshToken };
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
