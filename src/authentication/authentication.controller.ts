import {
  BadRequestException,
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Inject,
  Patch,
  Post,
  Req,
  Res,
  UnauthorizedException,
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
import { Response } from 'express';
import { GoogleOAuthGuard } from './guard/google-oauth.guard';
import { TwoFactorAuthLoginDTO } from './dto/2fa-auth.dto';
import { ProfileService } from 'src/profile/profile.service';
import { errorResponse, successResponse } from 'src/utils/response.util';
import { Logger } from 'winston';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';

@ApiTags('Authentication') // For api documentation tag
@Controller('auth')
export class AuthenticationController {
  constructor(
    private readonly authenticationService: AuthenticationService,
    private readonly profileService: ProfileService,
    @Inject(WINSTON_MODULE_PROVIDER) private readonly logger: Logger,
  ) {}

  // Handle the new user registration
  @Post('register')
  @HttpCode(HttpStatus.CREATED) // Ensures it returns 201 Created
  @ApiOperation({ summary: 'Register a new user' })
  @ApiResponse({ status: 201, description: 'User successfully registered' })
  @ApiResponse({ status: 400, description: 'Validation error' })
  async register(@Body() registerDto: RegisterDTO, @Res() res: Response) {
    try {
      const register = await this.authenticationService.register(registerDto);
      return successResponse(res, 'Registration successful', register);
    } catch (error) {
      this.logger.error(error.message);
      return errorResponse(res, 400, error.message);
    }
  }

  // Handle user login
  @Post('login')
  @HttpCode(HttpStatus.OK) // Returns 200 instead of default 201 for POST
  @ApiOperation({ summary: 'Authenticate user and generate an access token' })
  @ApiResponse({ status: 200, description: 'User successfully authenticated' })
  @ApiResponse({ status: 401, description: 'Invalid credentials' })
  async login(@Body() loginDto: LoginDTO, @Res() res: Response) {
    try {
      const login = await this.authenticationService.login(loginDto);
      return successResponse(res, 'Login successful', login);
    } catch (error) {
      this.logger.error(error.message);
      return errorResponse(res, 401, error.message);
    }
  }

  // Authenticate with 2FA code after login
  @Post('2fa/authenticate')
  async authenticate2FA(
    @Body() twoFALoginDto: TwoFactorAuthLoginDTO,
    @Res() res: Response,
  ) {
    try {
      const user = await this.profileService.getUserData(+twoFALoginDto.id);

      if (!user.secret_2fa) {
        throw new BadRequestException(
          'Two-factor authentication is not set up for this user',
        );
      }

      const isCodeValid =
        await this.profileService.verifyTwoFactorAuthenticationCode(
          twoFALoginDto.code,
          user,
        );

      if (!isCodeValid) {
        throw new UnauthorizedException('Invalid authentication code');
      }

      const login2FA = await this.authenticationService.loginWith2FA(user);

      return successResponse(
        res,
        'Two Factor Authentication Successfully',
        login2FA,
      );
    } catch (error) {
      this.logger.error(error.message);
      return errorResponse(res, error.status || 400, error.message);
    }
  }

  // Start Google Login — only triggers Passport redirect
  @Get('google')
  @UseGuards(GoogleOAuthGuard)
  async googleLogin() {
    // This will redirect to Google's OAuth consent screen
  }

  // Callback after Google login — process tokens and redirect
  @Get('google/callback')
  @UseGuards(GoogleOAuthGuard)
  async googleAuthRedirect(@Req() req, @Res() res: Response) {
    try {
      const googleLogin = await this.authenticationService.googleAuth(req.user);

      // Redirect to frontend with URL-encoded tokens
      const successUrl = `${process.env.FRONTEND_URL}/google-success?accessToken=${encodeURIComponent(googleLogin.accessToken)}&refreshToken=${encodeURIComponent(googleLogin.refreshToken)}`;
      return res.redirect(successUrl);
    } catch (error) {
      // On failure, redirect back to login with error
      this.logger.error(error.message);
      return res.redirect(`${process.env.FRONTEND_URL}/login?error=google`);
    }
  }

  // handle the refresh token
  @Post('refresh')
  @HttpCode(HttpStatus.OK) // Ensures it returns 200 OK
  @ApiOperation({ summary: 'Refresh access token using a refresh token' })
  @ApiResponse({
    status: 200,
    description: 'New access token generated successfully',
  })
  @ApiResponse({ status: 401, description: 'Invalid or expired refresh token' })
  async refreshTokens(
    @Body() refreshTokenDto: RefreshTokenDTO,
    @Res() res: Response,
  ) {
    try {
      const refresh =
        await this.authenticationService.refreshTokens(refreshTokenDto);
      return successResponse(
        res,
        'Refresh token generated successfully',
        refresh,
      );
    } catch (error) {
      this.logger.error(error.message);
      return errorResponse(res, 401, error.message);
    }
  }

  // handle change password
  @Patch('change-password')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.NO_CONTENT) // 204 No Content (best practice for password change)
  @ApiOperation({ summary: 'Change user password' })
  @ApiBearerAuth() // Adds Bearer token authentication in Swagger
  @ApiResponse({ status: 204, description: 'Password changed successfully' })
  @ApiResponse({ status: 400, description: 'Invalid request data' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async changePassword(
    @Req() req,
    @Body() changePasswordDto: ChangePasswordDTO,
    @Res() res: Response,
  ) {
    try {
      await this.authenticationService.changePassword(
        +req.user.userId,
        changePasswordDto,
      );
      return successResponse(res, 'Password changed successfully');
    } catch (error) {
      this.logger.error(error.message);
      return errorResponse(res, error.status || 400, error.message);
    }
  }

  // handle forgot password
  @Post('forgot-password')
  @HttpCode(HttpStatus.OK) // Ensures it returns 200 OK
  @ApiOperation({
    summary: 'Send password reset instructions to the user email',
  })
  @ApiResponse({
    status: 200,
    description: 'Password reset link sent successfully',
  })
  @ApiResponse({ status: 400, description: 'Invalid email format' })
  @ApiResponse({ status: 404, description: 'Email not found' })
  async forgotPassword(
    @Body() forgotPasswordDto: ForgotPasswordDTO,
    @Res() res: Response,
  ) {
    try {
      const forgotPassword =
        await this.authenticationService.forgotPassword(forgotPasswordDto);
      return successResponse(res, 'Email sent successfully', forgotPassword);
    } catch (error) {
      this.logger.error(error.message);
      return errorResponse(res, error.status || 400, error.message);
    }
  }

  // handle reset password
  @Patch('reset-password')
  @HttpCode(HttpStatus.OK) // Ensures it returns 200 OK
  @ApiOperation({ summary: 'Reset user password using a reset token' })
  @ApiResponse({ status: 200, description: 'Password reset successfully' })
  @ApiResponse({ status: 400, description: 'Invalid request data' })
  @ApiResponse({ status: 401, description: 'Invalid or expired reset token' })
  async resetPassword(
    @Body() resetPasswordDto: ResetPasswordDTO,
    @Res() res: Response,
  ) {
    try {
      const resetPassword =
        await this.authenticationService.resetPassword(resetPasswordDto);
      return successResponse(res, 'Password reset successfully', resetPassword);
    } catch (error) {
      this.logger.error(error.message);
      return errorResponse(res, error.status || 401, error.message);
    }
  }
}
