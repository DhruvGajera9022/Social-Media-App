import { ApiProperty } from '@nestjs/swagger';
import { IsString, MinLength } from 'class-validator';

export class ResetPasswordDTO {
  @ApiProperty({
    description: 'Token received via email for resetting password',
    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
  })
  @IsString({ message: 'Reset token must be a string' })
  resetToken: string;

  @ApiProperty({
    description: 'New password to be set',
    example: 'NewSecurePass123',
    minLength: 6,
  })
  @IsString({ message: 'New password must be a string' })
  @MinLength(6, { message: 'New password must be at least 6 characters long' })
  newPassword: string;
}
