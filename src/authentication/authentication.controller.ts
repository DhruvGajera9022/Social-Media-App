import {
  BadRequestException,
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  InternalServerErrorException,
  Patch,
  Post,
  Req,
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
import { Response } from 'src/utils/response.util';
import { Request } from 'express';
import { GoogleOAuthGuard } from './guard/google-oauth.guard';
import { TwitterAuthGuard } from './guard/twitter-oauth.guard';
import { FacebookAuthGuard } from './guard/facebook-oauth.guard';
import { TwoFactorAuthLoginDTO } from './dto/2fa-auth.dto';
import { ProfileService } from 'src/profile/profile.service';

@ApiTags('Authentication') // For api documentation tag
@Controller('auth')
export class AuthenticationController {
  constructor(
    private readonly authenticationService: AuthenticationService,
    private readonly profileService: ProfileService,
  ) {}

  // Handle the new user registration
  @Post('register')
  @HttpCode(HttpStatus.CREATED) // Ensures it returns 201 Created
  @ApiOperation({ summary: 'Register a new user' })
  @ApiResponse({ status: 201, description: 'User successfully registered' })
  @ApiResponse({ status: 400, description: 'Validation error' })
  async register(@Body() registerDto: RegisterDTO) {
    try {
      const register = await this.authenticationService.register(registerDto);
      return Response(true, 'Registration successful', register);
    } catch (error) {
      return Response(false, 'Failed to register.', error.message);
    }
  }

  // Handle user login
  @Post('login')
  @HttpCode(HttpStatus.OK) // Returns 200 instead of default 201 for POST
  @ApiOperation({ summary: 'Authenticate user and generate an access token' })
  @ApiResponse({ status: 200, description: 'User successfully authenticated' })
  @ApiResponse({ status: 401, description: 'Invalid credentials' })
  async login(@Body() loginDto: LoginDTO) {
    try {
      const login = await this.authenticationService.login(loginDto);
      return Response(true, 'Login successful', login);
    } catch (error) {
      return Response(false, 'Failed to login.', error.message);
    }
  }

  // Authenticate with 2FA code after login
  @Post('2fa/authenticate')
  async authenticate2FA(@Body() twoFALoginDto: TwoFactorAuthLoginDTO) {
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

      return Response(true, 'Two Factor Authentication Successfully', login2FA);
    } catch (error) {
      return Response(false, 'Fail to 2FA authentication', error.message);
    }
  }

  // // handle facebook login
  // @Get('facebook')
  // @UseGuards(FacebookAuthGuard)
  // async facebookLogin(): Promise<any> {
  //   // return { statusCode: HttpStatus.OK, message: 'Redirecting to Facebook...' };
  // }

  // // handle facebook redirect url
  // @Get('/facebook/redirect')
  // @UseGuards(FacebookAuthGuard)
  // async facebookLoginRedirect(@Req() req: Request): Promise<any> {
  //   try {
  //     const facebookLogin = await this.authenticationService.facebookAuth(
  //       req.user,
  //     );
  //     return Response(true, 'Facebook login successful.', facebookLogin);
  //   } catch (error) {
  //     return Response(false, 'Failed to login with facebook.', error.message);
  //   }
  // }

  // handle google login
  @Get('google')
  @UseGuards(GoogleOAuthGuard)
  async googleLogin() {}

  // handle google login callback
  @Get('google/callback')
  @UseGuards(GoogleOAuthGuard)
  async googleAuthRedirect(@Req() req) {
    try {
      const googleLogin = await this.authenticationService.googleAuth(req.user);
      return Response(true, 'Google login successful.', googleLogin);
    } catch (error) {
      return Response(false, 'Failed to login with google.', error.message);
    }
  }

  // // handle twitter login
  // @Get('twitter')
  // @UseGuards(TwitterAuthGuard)
  // async twitterAuth() {}

  // // handle twitter login callback
  // @Get('twitter/callback')
  // @UseGuards(TwitterAuthGuard)
  // async twitterAuthRedirect(@Req() req) {
  //   console.log(req.user);
  // }

  // handle the refresh token
  @Post('refresh')
  @HttpCode(HttpStatus.OK) // Ensures it returns 200 OK
  @ApiOperation({ summary: 'Refresh access token using a refresh token' })
  @ApiResponse({
    status: 200,
    description: 'New access token generated successfully',
  })
  @ApiResponse({ status: 401, description: 'Invalid or expired refresh token' })
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
  @Patch('reset-password')
  @HttpCode(HttpStatus.OK) // Ensures it returns 200 OK
  @ApiOperation({ summary: 'Reset user password using a reset token' })
  @ApiResponse({ status: 200, description: 'Password reset successfully' })
  @ApiResponse({ status: 400, description: 'Invalid request data' })
  @ApiResponse({ status: 401, description: 'Invalid or expired reset token' })
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
