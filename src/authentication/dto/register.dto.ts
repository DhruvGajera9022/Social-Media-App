import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsOptional, IsString, MinLength } from 'class-validator';

export class RegisterDTO {
  @ApiProperty({ description: 'User first name', example: 'John' })
  @IsString({ message: 'First name must be a string' })
  firstName!: string;

  @ApiProperty({ description: 'User last name', example: 'Doe' })
  @IsString({ message: 'Last name must be a string' })
  lastName!: string;

  @ApiProperty({
    description: 'User email address',
    example: 'john.doe@gmail.com',
  })
  @IsEmail({}, { message: 'Please enter a valid email address' })
  email!: string;

  @ApiProperty({
    description: 'User password',
    example: 'SecurePass123',
    minLength: 6,
  })
  @IsString({ message: 'Password must be a string' })
  @MinLength(6, { message: 'Password must be at least 6 characters long' })
  password!: string;

  @IsOptional()
  role: string;

  @IsOptional()
  profile_picture: string;
}
