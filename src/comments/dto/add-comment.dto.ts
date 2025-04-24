import { IsString } from 'class-validator';

export class AddCommentDTO {
  @IsString()
  content: string;
}
