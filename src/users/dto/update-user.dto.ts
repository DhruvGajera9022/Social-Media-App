<<<<<<< HEAD
import { IsEmail, IsEnum, IsString } from 'class-validator';
=======
import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsEnum, IsOptional, IsString } from 'class-validator';
import { Role } from 'src/authentication/enum/role.enum';
>>>>>>> a8cd9d37827d64f1581baad14764b01a28145e91

export class UpdateUserDTO {
  @ApiProperty({
    description: 'User first name',
    example: 'John',
    required: false,
  })
  @IsOptional()
  @IsString({ message: 'First name must be a string' })
  firstName: string;

  @ApiProperty({
    description: 'User last name',
    example: 'Doe',
    required: false,
  })
  @IsOptional()
  @IsString({ message: 'Last name must be a string' })
  lastName: string;

  @ApiProperty({
    description: 'User email address',
    example: 'john.doe@example.com',
    required: false,
  })
  @IsOptional()
  @IsEmail({}, { message: 'Please enter a valid email address' })
  email: string;

<<<<<<< HEAD
  @IsString()
  // @IsEnum(Role, { message: 'Invalid role value' })
  role: string;
=======
  @ApiProperty({
    description: 'User role',
    example: 'Admin',
    enum: Role,
    required: false,
  })
  @IsOptional()
  @IsEnum(Role, { message: 'Invalid role value' })
  role: Role;
>>>>>>> a8cd9d37827d64f1581baad14764b01a28145e91
}
