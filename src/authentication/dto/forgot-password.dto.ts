import { IsEmail } from 'class-validator';

export class ForgotPasswordDTO {
  @IsEmail({}, { message: 'Please enter a valid email address' })
  email: string;
}
