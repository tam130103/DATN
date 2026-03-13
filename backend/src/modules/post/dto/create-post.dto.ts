import { IsString, IsArray, ArrayMinSize, ArrayMaxSize, IsEnum, ValidateNested, IsOptional, IsUrl } from 'class-validator';
import { MediaType } from '../entities/media.entity';
import { Type } from 'class-transformer';

export class CreateMediaDto {
  @IsUrl({ require_tld: false }, { message: 'url must be a valid URL' })
  url: string;

  @IsEnum(MediaType)
  type: MediaType;
}

export class CreatePostDto {
  @IsString()
  caption: string;

  @IsArray()
  @IsOptional()
  @ArrayMinSize(1, { message: 'At least 1 media is required when media array is provided' })
  @ArrayMaxSize(10, { message: 'Maximum 10 media allowed' })
  @ValidateNested({ each: true })
  @Type(() => CreateMediaDto)
  media?: CreateMediaDto[];
}

