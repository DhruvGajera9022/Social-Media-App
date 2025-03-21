import { IsEmail, IsEnum, IsString } from 'class-validator';
import { Role } from 'src/authentication/enum/role.enum';

export class UpdateUserDTO {
  @IsString()
  firstName: string;

  @IsString()
  lastName: string;

  @IsString()
  @IsEmail({}, { message: 'Please enter a valid email address' })
  email: string;

  @IsString()
  @IsEnum(Role, { message: 'Invalid role value' })
  role: Role;
}
