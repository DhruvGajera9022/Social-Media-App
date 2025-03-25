import { IsEmail, IsEnum, IsString } from 'class-validator';

export class UpdateUserDTO {
  @IsString()
  firstName: string;

  @IsString()
  lastName: string;

  @IsString()
  @IsEmail({}, { message: 'Please enter a valid email address' })
  email: string;

  @IsString()
  // @IsEnum(Role, { message: 'Invalid role value' })
  role: string;
}
