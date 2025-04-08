import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsEnum, IsOptional, IsString } from 'class-validator';

export class UpdateUserDTO {
  @ApiProperty({
    description: 'Username',
    example: 'John123',
    required: false,
  })
  @IsOptional()
  @IsString({ message: 'Username must be a string' })
  username: string;

  @ApiProperty({
    description: 'User email address',
    example: 'john.doe@example.com',
    required: false,
  })
  @IsOptional()
  @IsEmail({}, { message: 'Please enter a valid email address' })
  email: string;

  @IsString()
  // @IsEnum(Role, { message: 'Invalid role value' })
  roleId: number;
}
