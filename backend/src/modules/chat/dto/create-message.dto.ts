import { IsString, IsOptional, IsUrl } from 'class-validator';

export class CreateMessageDto {
  @IsString()
  @IsOptional()
  conversationId?: string;

  @IsString()
  content: string;

  @IsUrl()
  @IsOptional()
  mediaUrl?: string;
}
