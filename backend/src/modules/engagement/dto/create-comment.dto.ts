import { IsString, MinLength, IsOptional } from 'class-validator';

export class CreateCommentDto {
  @IsString()
  @MinLength(1)
  content: string;

  @IsString()
  @IsOptional()
  parentId?: string;
}
