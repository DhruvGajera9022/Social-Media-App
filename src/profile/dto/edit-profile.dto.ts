import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEmail, IsOptional, IsString } from 'class-validator';

export class EditProfileDTO {
  @ApiPropertyOptional({
    description: 'First Name of the user',
    example: 'John',
    required: false,
  })
  @IsOptional()
  @IsString({ message: 'First Name must be a string' })
  firstName?: string;

  @ApiPropertyOptional({
    description: 'Last Name of the user',
    example: 'Doe',
    required: false,
  })
  @IsOptional()
  @IsString({ message: 'Last Name must be a string' })
  lastName?: string;

  @ApiPropertyOptional({
    description: 'Username of the user',
    example: 'John123',
    required: false,
  })
  @IsOptional()
  @IsString({ message: 'Username must be a string' })
  username?: string;

  @ApiPropertyOptional({
    description: 'Email address of the user',
    example: 'john.doe@example.com',
    required: false,
  })
  @IsOptional()
  @IsEmail({}, { message: 'Please enter a valid email address' })
  email?: string;

  @ApiPropertyOptional({
    description:
      'Set profile visibility: `true` for private, `false` for public',
    example: true,
    required: false,
  })
  @IsOptional()
  is_private?: boolean;
}
