import { ApiProperty } from '@nestjs/swagger';
import { IsString, MinLength } from 'class-validator';

export class ChangePasswordDTO {
  @ApiProperty({
    description: 'Current password of the user',
    example: 'OldPass123',
    minLength: 6,
  })
  @IsString({ message: 'Old password must be a string' })
  @MinLength(6, { message: 'Old password must be at least 6 characters long' })
  oldPassword: string;

  @ApiProperty({
    description: 'New password to be set',
    example: 'NewPass456',
    minLength: 6,
  })
  @IsString({ message: 'New password must be a string' })
  @MinLength(6, { message: 'New password must be at least 6 characters long' })
  newPassword: string;
}
