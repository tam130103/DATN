import { IsString, IsOptional, MaxLength, IsUrl } from 'class-validator';

export class UpdateProfileDto {
  @IsString()
  @IsOptional()
  @MaxLength(30)
  username?: string;

  @IsString()
  @IsOptional()
  @MaxLength(50)
  name?: string;

  @IsString()
  @IsOptional()
  @MaxLength(150)
  bio?: string;

  @IsUrl()
  @IsOptional()
  avatarUrl?: string;
}
