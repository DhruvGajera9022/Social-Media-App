import { IsEnum, IsOptional, IsString } from 'class-validator';
import { PostEnum } from '../enum/post-status.enum';

export class CreatePostDTO {
  @IsString()
  title: string;

  @IsString()
  content: string;

  @IsOptional()
  @IsEnum(PostEnum, { message: 'Invalid post status' })
  status: PostEnum;

  @IsOptional()
  media_url: string[];
}
