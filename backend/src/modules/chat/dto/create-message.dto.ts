import { IsString, IsOptional, IsNotEmpty } from 'class-validator';

export class CreateMessageDto {
  @IsString()
  @IsNotEmpty({ message: 'Nội dung tin nhắn không được để trống.' })
  content: string;

  @IsString()
  @IsOptional()
  mediaUrl?: string;
}
