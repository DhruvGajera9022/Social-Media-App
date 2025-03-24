import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Patch,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { AuthenticationService } from './authentication.service';
import { RegisterDTO } from './dto/register.dto';
import { LoginDTO } from './dto/login.dto';
import { RefreshTokenDTO } from './dto/refresh-token.dto';
import { ChangePasswordDTO } from './dto/change-password.dto';
import { JwtAuthGuard } from './guard/jwt-auth.guard';
import { ForgotPasswordDTO } from './dto/forgot-password.dto';
import { ResetPasswordDTO } from './dto/reset-password.dto';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { Response } from 'src/utils/response.util';

@ApiTags('Authentication')
@Controller('auth')
export class AuthenticationController {
  constructor(private readonly authenticationService: AuthenticationService) {}

  // Handle the new user registration
  @ApiOperation({ summary: 'Register a new user' })
  @ApiResponse({ status: 201, description: 'User successfully registered' })
  @ApiResponse({ status: 400, description: 'Validation error' })
  @Post('register')
  @HttpCode(HttpStatus.CREATED) // Ensures it returns 201 Created
  async register(@Body() registerDto: RegisterDTO) {
    try {
      const register = await this.authenticationService.register(registerDto);
      return Response(true, 'Registration successful', register);
    } catch (error) {
      return Response(false, 'Failed to register.', error.message);
    }
  }

  // Handle user login
  @ApiOperation({ summary: 'Authenticate user and generate an access token' })
  @ApiResponse({ status: 200, description: 'User successfully authenticated' })
  @ApiResponse({ status: 401, description: 'Invalid credentials' })
  @HttpCode(HttpStatus.OK) // Returns 200 instead of default 201 for POST
  @Post('login')
  async login(@Body() loginDto: LoginDTO) {
    try {
      const login = await this.authenticationService.login(loginDto);
      return Response(true, 'Login successful', login);
    } catch (error) {
      return Response(false, 'Failed to login.', error.message);
    }
  }

  // handle the refresh token
  @ApiOperation({ summary: 'Refresh access token using a refresh token' })
  @ApiResponse({
    status: 200,
    description: 'New access token generated successfully',
  })
  @ApiResponse({ status: 401, description: 'Invalid or expired refresh token' })
  @HttpCode(HttpStatus.OK) // Ensures it returns 200 OK
  @Post('refresh')
  async refreshTokens(@Body() refreshTokenDto: RefreshTokenDTO) {
    try {
      const refresh =
        await this.authenticationService.refreshTokens(refreshTokenDto);
      return Response(true, 'Refresh token generated successfully', refresh);
    } catch (error) {
      return Response(
        false,
        'Failed to generate refresh token.',
        error.message,
      );
    }
  }

  // handle change password
  @ApiOperation({ summary: 'Change user password' })
  @ApiBearerAuth() // Adds Bearer token authentication in Swagger
  @ApiResponse({ status: 204, description: 'Password changed successfully' })
  @ApiResponse({ status: 400, description: 'Invalid request data' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.NO_CONTENT) // 204 No Content (best practice for password change)
  @Patch('change-password')
  async changePassword(
    @Req() req,
    @Body() changePasswordDto: ChangePasswordDTO,
  ) {
    try {
      const changePassword = this.authenticationService.changePassword(
        +req.user.userId,
        changePasswordDto,
      );
      return Response(false, 'Password changed.', changePassword);
    } catch (error) {
      return Response(false, 'Failed to change password.', error.message);
    }
  }

  // handle forgot password
  @ApiOperation({
    summary: 'Send password reset instructions to the user email',
  })
  @ApiResponse({
    status: 200,
    description: 'Password reset link sent successfully',
  })
  @ApiResponse({ status: 400, description: 'Invalid email format' })
  @ApiResponse({ status: 404, description: 'Email not found' })
  @HttpCode(HttpStatus.OK) // Ensures it returns 200 OK
  @Post('forgot-password')
  async forgotPassword(@Body() forgotPasswordDto: ForgotPasswordDTO) {
    try {
      const forgotPassword =
        await this.authenticationService.forgotPassword(forgotPasswordDto);
      return Response(false, 'Email sent successfully.', forgotPassword);
    } catch (error) {
      return Response(false, 'Failed to forgot password.', error.message);
    }
  }

  // handle reset password
  @ApiOperation({ summary: 'Reset user password using a reset token' })
  @ApiResponse({ status: 200, description: 'Password reset successfully' })
  @ApiResponse({ status: 400, description: 'Invalid request data' })
  @ApiResponse({ status: 401, description: 'Invalid or expired reset token' })
  @HttpCode(HttpStatus.OK) // Ensures it returns 200 OK
  @Patch('reset-password')
  async resetPassword(@Body() resetPasswordDto: ResetPasswordDTO) {
    try {
      const resetPassword =
        await this.authenticationService.resetPassword(resetPasswordDto);
      return Response(false, 'Password reset successfully.', resetPassword);
    } catch (error) {
      return Response(false, 'Failed to reset password.', error.message);
    }
  }
}
