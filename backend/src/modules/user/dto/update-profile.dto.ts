import { IsString, IsOptional, MaxLength, IsUrl, Matches } from 'class-validator';

export class UpdateProfileDto {
  @IsString()
  @IsOptional()
  @MaxLength(30)
  @Matches(/^[a-zA-Z0-9_.]+$/, { message: 'Tên người dùng chỉ được chứa chữ cái, số, dấu chấm và dấu gạch dưới, không có khoảng trắng.' })
  username?: string;

  @IsString()

  @IsOptional()
  @MaxLength(50)
  name?: string;

  @IsString()
  @IsOptional()
  @MaxLength(150)
  bio?: string;

  @IsUrl({ require_tld: false })
  @IsOptional()
  avatarUrl?: string;
}
