import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsString } from 'class-validator';

export class TwoFactorAuthLoginDTO {
  @ApiProperty({
    description: 'User email address',
    example: 'john.doe@gmail.com',
  })
  @IsEmail({}, { message: 'Please enter a valid email address' })
  email: string;

  @ApiProperty({
    description: 'Authentication code',
    example: '123456',
  })
  @IsNotEmpty()
  @IsString()
  code: string;
}
