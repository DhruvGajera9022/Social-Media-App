import {
  IsArray,
  IsEnum,
  IsOptional,
  IsString,
  MinLength,
} from 'class-validator';
import { PostEnum } from '../enum/post-status.enum';

export class CreatePostDTO {
  @IsString()
  @MinLength(3, { message: 'Title must be at least 3 characters long' })
  title: string;

  @IsString()
  @MinLength(10, { message: 'Content must be at least 10 characters long' })
  content: string;

  @IsOptional()
  @IsEnum(PostEnum, { message: 'Invalid post status' })
  status: PostEnum;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  media_url?: string[];
}
