import { IsString } from 'class-validator';

export class RefreshTokenDTO {
  @IsString()
  token: string;
}
