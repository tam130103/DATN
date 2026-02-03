import { IsString, IsOptional, IsUrl } from 'class-validator';

export class CreateMessageDto {
  @IsString()
  conversationId: string;

  @IsString()
  content: string;

  @IsUrl()
  @IsOptional()
  mediaUrl?: string;
}
