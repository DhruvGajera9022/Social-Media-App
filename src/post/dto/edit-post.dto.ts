import {
  IsArray,
  IsEnum,
  IsOptional,
  IsString,
  MinLength,
} from 'class-validator';
import { PostEnum } from '../enum/post-status.enum';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class EditPostDTO {
  @ApiPropertyOptional({
    description: 'Title of the post',
    example: 'My First Post',
  })
  @IsOptional()
  @IsString()
  @MinLength(3, { message: 'Title must be at least 3 characters long' })
  title?: string;

  @ApiPropertyOptional({
    description: 'Content of the post',
    example: 'This is my first blog post.',
  })
  @IsOptional()
  @IsString()
  @MinLength(10, { message: 'Content must be at least 10 characters long' })
  content?: string;

  @ApiPropertyOptional({ description: 'Status of the post', enum: PostEnum })
  @IsOptional()
  @IsEnum(PostEnum, { message: 'Invalid post status' })
  status?: PostEnum;

  @ApiPropertyOptional({
    description: 'Array of media URLs',
    example: ['https://example.com/image1.jpg'],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true, message: 'Each media URL must be a string' })
  media_url?: string[];
}
