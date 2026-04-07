import { IsEnum, IsOptional, IsString } from 'class-validator';
import { PostStatus } from '../../post/entities/post.entity';

export class ModeratePostDto {
  @IsEnum(PostStatus)
  status: PostStatus;

  @IsOptional()
  @IsString()
  reason?: string;
}
