import { IsEnum, IsOptional, IsString } from 'class-validator';
import { CommentStatus } from '../../engagement/entities/comment.entity';

export class ModerateCommentDto {
  @IsEnum(CommentStatus)
  status: CommentStatus;

  @IsOptional()
  @IsString()
  reason?: string;
}
