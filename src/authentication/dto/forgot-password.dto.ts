import { ApiProperty } from '@nestjs/swagger';
import { IsEmail } from 'class-validator';

export class ForgotPasswordDTO {
  @ApiProperty({
    description: 'User email address to receive password reset instructions',
    example: 'john.doe@example.com',
  })
  @IsEmail(
    {},
    { message: 'Invalid email format. Please enter a valid email address.' },
  )
  email: string;
}
