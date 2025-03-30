import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEmail, IsOptional, IsString } from 'class-validator';

export class EditProfileDTO {
  @ApiPropertyOptional({
    description: 'First name of the user',
    example: 'John',
    required: false,
  })
  @IsOptional()
  @IsString({ message: 'First name must be a string' })
  firstName?: string;

  @ApiPropertyOptional({
    description: 'Last name of the user',
    example: 'Doe',
    required: false,
  })
  @IsOptional()
  @IsString({ message: 'Last name must be a string' })
  lastName?: string;

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
