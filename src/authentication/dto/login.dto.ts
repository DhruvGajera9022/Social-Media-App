import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsString, MinLength } from 'class-validator';

export class LoginDTO {
  @ApiProperty({
    description: 'Provide the email',
    example: 'jon.doe@gmail.com',
  })
  @IsEmail({}, { message: 'Please enter a valid email address' })
  email: string;

  @ApiProperty({ description: 'user password', example: 'jon1234' })
  @IsString()
  @MinLength(6, { message: 'Password must be at least 6 characters long' })
  password: string;
}

// export class LoginResponseDTO {
//   @ApiProperty()
//   email: string;

//   @ApiProperty()
//   password: string;
// }
