import { IsString } from 'class-validator';

export class CommentPostDTO {
  @IsString()
  content: string;
}
