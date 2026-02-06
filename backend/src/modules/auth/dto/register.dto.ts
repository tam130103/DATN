import { IsEmail, IsString, MinLength, IsOptional, MaxLength } from 'class-validator';

export class RegisterDto {
  @IsEmail({}, { message: 'Invalid email format' })
  email: string;

  @IsString()
  @MinLength(6, { message: 'Password must be at least 6 characters' })
  @MaxLength(100, { message: 'Password is too long' })
  password: string;

  @IsString()
  @IsOptional()
  @MaxLength(100, { message: 'Name is too long' })
  name?: string;
}
