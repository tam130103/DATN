import { ArrayMinSize, IsArray, IsBoolean, IsOptional, IsString, IsUUID } from 'class-validator';

export class CreateConversationDto {
  @IsArray()
  @ArrayMinSize(1)
  @IsUUID('4', { each: true })
  participantIds: string[];

  @IsBoolean()
  @IsOptional()
  isGroup?: boolean;

  @IsString()
  @IsOptional()
  name?: string;
}
