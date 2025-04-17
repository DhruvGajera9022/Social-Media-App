import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Put,
  Req,
  Res,
  UnauthorizedException,
  UploadedFile,
  UseGuards,
  UseInterceptors,
  ValidationPipe,
} from '@nestjs/common';
import { ProfileService } from './profile.service';
import { JwtAuthGuard } from 'src/authentication/guard/jwt-auth.guard';
import { EditProfileDTO } from './dto/edit-profile.dto';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname } from 'path';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { TwoFactorAuthDTO } from './dto/two-factor-auth.dto';
import { TwoFactorAuthLoginDTO } from 'src/authentication/dto/2fa-auth.dto';
import { Response } from 'express';
import { successResponse, errorResponse } from '../utils/response.util'; // Adjust the import path as needed

@ApiTags('Profile') // Tags for api documentation
@ApiBearerAuth() // Requires authentication in Swagger
@Controller('profile')
export class ProfileController {
  constructor(private readonly profileService: ProfileService) {}

  // Get user profile
  @Get()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Get user profile' })
  @ApiResponse({ status: 200, description: 'Profile retrieved successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getProfile(@Req() req, @Res() res: Response) {
    try {
      const profile = await this.profileService.getProfile(+req.user.userId);
      return successResponse(res, 'Profile fetched successfully', profile);
    } catch (error) {
      return errorResponse(res, 400, 'Failed to fetch profile data.');
    }
  }

  // Get user profile by ID
  @Get(':id')
  @ApiOperation({ summary: 'Get user profile by id' })
  @ApiResponse({ status: 200, description: 'Profile retrieved successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getProfileById(@Param('id') id: string, @Res() res: Response) {
    try {
      const profile = await this.profileService.getProfileById(+id);
      return successResponse(res, 'Profile fetched successfully', profile);
    } catch (error) {
      return errorResponse(res, 400, 'Failed to fetch profile data.');
    }
  }

  // Edit Profile
  @Put()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Edit user profile' })
  @ApiResponse({ status: 200, description: 'Profile updated successfully' })
  @ApiResponse({ status: 400, description: 'Invalid input data' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async editProfile(
    @Req() req,
    @Body() editProfileDto: EditProfileDTO,
    @Res() res: Response,
  ) {
    try {
      const editProfile = await this.profileService.editProfile(
        +req.user.userId,
        editProfileDto,
      );
      return successResponse(res, 'Profile edited successfully', editProfile);
    } catch (error) {
      return errorResponse(res, 400, 'Failed to edit profile.');
    }
  }

  // 📌 Update Profile Picture Separately
  @Put('profile-picture')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Edit user profile-picture' })
  @ApiResponse({
    status: 200,
    description: 'Profile-Picture updated successfully',
  })
  @ApiResponse({ status: 400, description: 'Invalid input data' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @UseInterceptors(
    FileInterceptor('profile_picture', {
      storage: diskStorage({
        destination: './uploads/profile_pictures', // Organized storage
        filename: (req, file, callback) => {
          const uniqueSuffix =
            Date.now() + '-' + Math.round(Math.random() * 1e9);
          const ext = extname(file.originalname);
          const fileName = `${uniqueSuffix}${ext}`;
          callback(null, fileName);
        },
      }),
      fileFilter: (req, file, callback) => {
        const allowedExtensions = ['.jpg', '.jpeg', '.png', '.gif'];
        const ext = extname(file.originalname).toLowerCase();
        if (!allowedExtensions.includes(ext)) {
          return callback(new Error('Only image files are allowed!'), false);
        }
        callback(null, true);
      },
    }),
  )
  async updateProfilePicture(
    @Req() req,
    @UploadedFile() file: Express.Multer.File,
    @Res() res: Response,
  ) {
    try {
      const userId = +req.user.userId;
      const { message } = await this.profileService.editProfilePicture(
        userId,
        file,
      );
      return successResponse(res, message);
    } catch (error) {
      return errorResponse(res, 400, 'Fail to update profile-picture');
    }
  }

  // 📌 Remove Profile Picture
  @Patch('remove-profile-picture')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Remove user profile-picture' })
  @ApiResponse({
    status: 200,
    description: 'Profile-Picture updated successfully',
  })
  @ApiResponse({ status: 400, description: 'Invalid input data' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async removeProfilePicture(@Req() req, @Res() res: Response) {
    try {
      const userId = +req.user.userId;
      const { message } =
        await this.profileService.removeProfilePicture(userId);
      return successResponse(res, message);
    } catch (error) {
      return errorResponse(res, 400, 'Fail to remove the profile-picture');
    }
  }

  // 📌 Request to Follow
  @Post(':id/follow')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Send a follow request' })
  @ApiResponse({ status: 201, description: 'Follow request sent.' })
  @ApiResponse({ status: 400, description: 'Follow request already sent.' })
  async requestToFollow(
    @Param('id') targetId: string,
    @Req() req,
    @Res() res: Response,
  ) {
    try {
      const userId = +req.user.userId;
      const { message } = await this.profileService.requestToFollow(
        +targetId,
        userId,
      );
      return successResponse(res, message);
    } catch (error) {
      return errorResponse(res, 400, 'Fail to send follow request.');
    }
  }

  // 📌 Accept Follow Request
  @Post(':id/accept-follow')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Accept a follow request' })
  @ApiResponse({ status: 200, description: 'Follow request accepted.' })
  @ApiResponse({ status: 400, description: 'No follow request found.' })
  async acceptFollow(
    @Param('id') requesterId: string,
    @Req() req,
    @Res() res: Response,
  ) {
    try {
      const userId = +req.user.userId;
      const { message } = await this.profileService.acceptFollowRequest(
        +requesterId,
        userId,
      );
      return successResponse(res, message);
    } catch (error) {
      return errorResponse(res, 400, 'Fail to accept the request.');
    }
  }

  // 📌 Cancel Follow Request
  @Post(':id/cancel-request')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Cancel a follow request' })
  @ApiResponse({ status: 200, description: 'Follow request canceled.' })
  @ApiResponse({ status: 400, description: 'No follow request found.' })
  async cancelFollowRequest(
    @Req() req,
    @Param('id') targetId: number,
    @Res() res: Response,
  ) {
    try {
      const requesterId = req.user.userId;
      const { message } = await this.profileService.cancelFollowRequest(
        requesterId,
        +targetId,
      );
      return successResponse(res, message);
    } catch (error) {
      return errorResponse(res, 400, 'Fail to cancel follow request.');
    }
  }

  // 📌 Unfollow User
  @Post(':id/unfollow')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Unfollow a user' })
  @ApiResponse({ status: 200, description: 'Unfollowed successfully.' })
  @ApiResponse({ status: 400, description: 'You are not following this user.' })
  async unfollow(
    @Param('id') targetId: string,
    @Req() req,
    @Res() res: Response,
  ) {
    try {
      const userId = +req.user.userId;
      const { message } = await this.profileService.unfollowUser(
        +targetId,
        userId,
      );
      return successResponse(res, message);
    } catch (error) {
      return errorResponse(res, 400, 'Fail to unfollow user.');
    }
  }

  // 📌 Get Followers
  @Get('followers')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Get Followers List' })
  @ApiResponse({
    status: 200,
    description: 'Successfully retrieved followers list.',
  })
  @ApiResponse({ status: 400, description: 'Fail retrieved followers list.' })
  async getFollowers(@Req() req, @Res() res: Response) {
    try {
      const userId = +req.user.userId;
      const userFollowers = await this.profileService.followersList(userId);
      return successResponse(
        res,
        'Successfully retrieved followers list.',
        userFollowers,
      );
    } catch (error) {
      return errorResponse(res, 400, 'Fail to get followers list.');
    }
  }

  // 📌 Get Following
  @Get('following')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Get Following List' })
  @ApiResponse({
    status: 200,
    description: 'Successfully retrieved following list.',
  })
  @ApiResponse({ status: 400, description: 'Fail retrieved following list.' })
  async getFollowing(@Req() req, @Res() res: Response) {
    try {
      const userId = +req.user.userId;
      const userFollowing = await this.profileService.followingList(userId);
      return successResponse(
        res,
        'Successfully retrieved following list.',
        userFollowing,
      );
    } catch (error) {
      return errorResponse(res, 400, 'Fail to get following list.');
    }
  }

  // 📌 Get Follow Requests List
  @Get('follow-request')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Get follow requests.' })
  @ApiResponse({
    status: 200,
    description: 'Follow requests fetched successfully.',
  })
  @ApiResponse({ status: 400, description: 'Bad request.' })
  async followRequests(@Req() req, @Res() res: Response) {
    try {
      const userId = +req.user.userId;
      const followRequests =
        await this.profileService.getFollowRequests(userId);
      return successResponse(
        res,
        'Follow requests fetched successfully.',
        followRequests,
      );
    } catch (error) {
      return errorResponse(res, 400, 'Fail to get follow requests.');
    }
  }

  // 📌 Block User
  @Post(':id/block')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({
    summary: 'Block a user',
  })
  @ApiResponse({ status: 200, description: 'User blocked successfully.' })
  @ApiResponse({ status: 400, description: 'Bad request.' })
  async blockUser(
    @Param('id') targetId: string,
    @Req() req,
    @Res() res: Response,
  ) {
    try {
      const userId = +req.user.userId;
      const { message } = await this.profileService.blockUser(
        userId,
        +targetId,
      );
      return successResponse(res, message);
    } catch (error) {
      return errorResponse(res, 400, 'Fail to block user.');
    }
  }

  // 📌 Unblock User
  @Post(':id/unblock')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({
    summary: 'Unblock a user',
  })
  @ApiResponse({ status: 200, description: 'User unblocked successfully.' })
  @ApiResponse({ status: 400, description: 'Bad request.' })
  async unblockUser(
    @Param('id') targetId: string,
    @Req() req,
    @Res() res: Response,
  ) {
    try {
      const userId = +req.user.userId;
      const { message } = await this.profileService.unblockUser(
        userId,
        +targetId,
      );
      return successResponse(res, message);
    } catch (error) {
      return errorResponse(res, 400, 'Fail to unblock user.');
    }
  }

  // 📌 Check user block
  @Get(':id/is-blocked')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Check if a user is blocked' })
  @ApiResponse({
    status: 200,
    description: 'Returns whether the user is blocked.',
  })
  @ApiResponse({ status: 400, description: 'Bad request.' })
  async isUserBlocked(
    @Param('id') targetId: string,
    @Req() req,
    @Res() res: Response,
  ) {
    try {
      const userId = +req.user.userId;
      const isBlocked = await this.profileService.isUserBlocked(
        userId,
        +targetId,
      );
      return successResponse(res, 'Block status retrieved', { isBlocked });
    } catch (error) {
      return errorResponse(res, 400, 'Fail to check user is blocked or not.');
    }
  }

  // 📌 Get Blocked Users List
  @Get('blocked')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Get Blocked List.' })
  @ApiResponse({
    status: 200,
    description: 'Successfully retrieved blocked list.',
  })
  @ApiResponse({ status: 400, description: 'Fail retrieved blocked list.' })
  async blockedList(@Req() req, @Res() res: Response) {
    try {
      const userId = +req.user.userId;
      const blockedUsers = await this.profileService.getBlockedUsers(userId);
      return successResponse(
        res,
        'Blocked users retrieved successfully.',
        blockedUsers,
      );
    } catch (error) {
      return errorResponse(res, 400, 'Fail to retrieve the blocked users.');
    }
  }

  // 📌 Get Mutual Followers
  @Get(':id/mutual-followers')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Get mutual followers.' })
  @ApiResponse({
    status: 200,
    description: 'Mutual followers fetched successfully.',
  })
  @ApiResponse({ status: 400, description: 'Bad request.' })
  async mutualFollowers(
    @Param('id') targetId: string,
    @Req() req,
    @Res() res: Response,
  ) {
    try {
      const userId = +req.user.userId;
      const mutualFollowers = await this.profileService.getMutualFollowers(
        +targetId,
        userId,
      );
      return successResponse(
        res,
        'Mutual followers fetched successfully.',
        mutualFollowers,
      );
    } catch (error) {
      return errorResponse(res, 400, 'Fail to get mutual followers.');
    }
  }

  // 📌 Deactivate Account
  @Patch('deactivate')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Deactivate account.' })
  @ApiResponse({
    status: 200,
    description: 'Account deactivated successfully.',
  })
  @ApiResponse({ status: 400, description: 'Bad request.' })
  async deactivateAccount(@Req() req, @Res() res: Response) {
    try {
      const userId = +req.user.userId;
      const { message } = await this.profileService.deactivateAccount(userId);
      return successResponse(res, message);
    } catch (error) {
      return errorResponse(res, 400, 'Fail to deactivate account.');
    }
  }

  // 📌 Reactivate Account
  @Patch('reactivate')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Reactivate account.' })
  @ApiResponse({
    status: 200,
    description: 'Account reactivated successfully.',
  })
  @ApiResponse({ status: 400, description: 'Bad request.' })
  async reactivateAccount(@Req() req, @Res() res: Response) {
    try {
      const userId = +req.user.userId;
      const { message } = await this.profileService.reactivateAccount(userId);
      return successResponse(res, message);
    } catch (error) {
      return errorResponse(res, 400, 'Fail to reactivate account.');
    }
  }

  // 📌 Search User
  @Get('search/:query')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Search users by name' })
  @ApiResponse({
    status: 200,
    description: 'Search results fetched successfully',
  })
  @ApiResponse({ status: 400, description: 'Bad request.' })
  async searchUser(
    @Param('query') query: string,
    @Req() req,
    @Res() res: Response,
  ) {
    try {
      const userId = +req.user.userId;
      const users = await this.profileService.searchUser(userId, query);
      return successResponse(res, 'Search results fetched successfully', users);
    } catch (error) {
      return errorResponse(res, 400, 'Fail to search user.');
    }
  }

  // 📌 Generate 2FA secret and QR code
  @Post('2fa/generate')
  @UseGuards(JwtAuthGuard)
  async generateTwoFactorAuth(@Req() req, @Res() res: Response) {
    try {
      const userId = +req.user.userId;
      const user = await this.profileService.getUserData(userId);

      // Check if user already has 2FA secret (optional reset)
      if (user.secret_2fa) {
        return errorResponse(
          res,
          400,
          'Two-factor authentication is already set up. Disable it first to generate a new secret.',
        );
      }

      const { otpAuthUrl, secret } =
        await this.profileService.generateTwoFactorAuthenticationSecret(user);

      // Generate QR code
      const qrCode =
        await this.profileService.generateQrCodeDataURL(otpAuthUrl);

      return successResponse(res, 'QR code generated', { secret, qrCode });
    } catch (error) {
      return errorResponse(
        res,
        400,
        'Fail to enable two factor authentication.',
      );
    }
  }

  // 📌 Turn on 2FA for user
  @Post('2fa/turn-on')
  @UseGuards(JwtAuthGuard)
  async turnOnTwoFactorAuth(
    @Req() req,
    @Body() twoFactorAuthDto: TwoFactorAuthDTO,
    @Res() res: Response,
  ) {
    try {
      // Get user data from JWT token
      const userId = +req.user.userId;
      const user = await this.profileService.getUserData(userId);

      // Check if 2FA is enabled or not
      if (!user.secret_2fa) {
        return errorResponse(
          res,
          400,
          'Two-factor authentication is not set up yet. Generate a secret first.',
        );
      }

      // Check if 2FA is already enabled
      if (user.is_2fa) {
        return successResponse(
          res,
          'Two-factor authentication is already enabled',
        );
      }

      // Verify the code and secret
      const isCodeValid =
        await this.profileService.verifyTwoFactorAuthenticationCode(
          twoFactorAuthDto.code,
          user,
        );

      // Check it code is valid or not
      if (!isCodeValid) {
        return errorResponse(res, 401, 'Invalid authentication code');
      }

      // Enable the 2FA
      await this.profileService.enableTwoFactorAuth(user);

      return successResponse(res, 'Two-factor authentication has been enabled');
    } catch (error) {
      return errorResponse(res, 400, 'Fail to turn on 2FA');
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
        return errorResponse(
          res,
          400,
          'Two-factor authentication is not set up for this user',
        );
      }

      const isCodeValid =
        await this.profileService.verifyTwoFactorAuthenticationCode(
          twoFALoginDto.code,
          user,
        );

      if (!isCodeValid) {
        return errorResponse(res, 401, 'Invalid authentication code');
      }

      const login2FA = await this.profileService.loginWith2FA(user);

      return successResponse(
        res,
        'Two Factor Authentication Successfully',
        login2FA,
      );
    } catch (error) {
      return errorResponse(res, 400, 'Fail to 2FA authentication');
    }
  }
}
