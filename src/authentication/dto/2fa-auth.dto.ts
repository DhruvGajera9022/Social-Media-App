import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsNumber, IsString } from 'class-validator';

export class TwoFactorAuthLoginDTO {
  @IsNotEmpty()
  id: string;

  @ApiProperty({
    description: 'Authentication code',
    example: '123456',
  })
  @IsNotEmpty()
  @IsString()
  code: string;
}
