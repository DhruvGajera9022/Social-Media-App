import { IsEmail, IsString, IsUrl } from 'class-validator';

export class EditProfileDTO {
  @IsString()
  firstName?: string;

  @IsString()
  lastName?: string;

  @IsEmail({}, { message: 'Please enter a valid email address' })
  email?: string;

  profile_picture?: string;
}
