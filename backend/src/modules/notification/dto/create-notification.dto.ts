import { IsString, IsEnum, IsOptional, IsObject } from 'class-validator';

export class CreateNotificationDto {
  @IsString()
  recipientId: string;

  @IsString()
  senderId: string;

  @IsEnum(['follow', 'like', 'comment', 'mention', 'message', 'tag'])
  type: 'follow' | 'like' | 'comment' | 'mention' | 'message' | 'tag';

  @IsObject()
  @IsOptional()
  data?: Record<string, any>;
}
