import { IsEnum, IsOptional, IsString } from 'class-validator';
import { UserStatus } from '../../user/entities/user.entity';

export class UpdateUserStatusDto {
  @IsEnum(UserStatus)
  status: UserStatus;

  @IsOptional()
  @IsString()
  reason?: string;
}
