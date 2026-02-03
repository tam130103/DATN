import { IsString, IsArray, ArrayMinSize, ArrayMaxSize, IsEnum, ValidateNested } from 'class-validator';
import { MediaType } from '../entities/media.entity';
import { Type } from 'class-transformer';

export class CreateMediaDto {
  url: string;
  @IsEnum(MediaType)
  type: MediaType;
}

export class CreatePostDto {
  @IsString()
  caption: string;

  @IsArray()
  @ArrayMinSize(1, { message: 'At least 1 media is required' })
  @ArrayMaxSize(10, { message: 'Maximum 10 media allowed' })
  @ValidateNested({ each: true })
  @Type(() => CreateMediaDto)
  media: CreateMediaDto[];
}
