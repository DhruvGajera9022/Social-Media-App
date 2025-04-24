import { IsString } from 'class-validator';

export class EditCommentDTO {
  @IsString()
  content: string;
}
