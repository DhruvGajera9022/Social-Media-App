import { Body, Controller, Delete, Post } from '@nestjs/common';
import { AuthenticationService } from './authentication.service';
import { RegisterDTO } from './dto/register.dto';
import { LoginDTO } from './dto/login.dto';
import { RefreshTokenDTO } from './dto/refresh-token.dto';

@Controller('auth')
export class AuthenticationController {
  constructor(private readonly authenticationService: AuthenticationService) {}

  // Handle the new user registration
  @Post('register')
  register(@Body() registerDto: RegisterDTO) {
    return this.authenticationService.register(registerDto);
  }

  // handle the user login
  @Post('login')
  login(@Body() loginDto: LoginDTO) {
    return this.authenticationService.login(loginDto);
  }

  // handle the refresh token
  @Post('refresh')
  refreshTokens(@Body() refreshTokenDto: RefreshTokenDTO) {
    return this.authenticationService.refreshTokens(refreshTokenDto);
  }
}
