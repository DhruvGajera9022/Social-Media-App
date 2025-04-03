import { IsNotEmpty, IsString } from 'class-validator';

export class TwoFactorAuthDTO {
  @IsNotEmpty()
  @IsString()
  code: string;
}
