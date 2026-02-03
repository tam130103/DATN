import { IsArray, IsString, IsOptional, IsBoolean } from 'class-validator';

export class CreateConversationDto {
  @IsArray()
  @IsString({ each: true })
  participantIds: string[];

  @IsBoolean()
  @IsOptional()
  isGroup?: boolean;

  @IsString()
  @IsOptional()
  name?: string;
}
