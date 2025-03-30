import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Req,
  Res,
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
import { Response } from 'src/utils/response.util';

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
  async getProfile(@Req() req) {
    try {
      const profile = await this.profileService.getProfile(+req.user.userId);
      return Response(true, 'Profile fetched successfully', profile);
    } catch (error) {
      return Response(false, 'Failed to fetch profile data.', error.message);
    }
  }

  // Edit Profile
  @Patch()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Edit user profile' })
  @ApiResponse({ status: 200, description: 'Profile updated successfully' })
  @ApiResponse({ status: 400, description: 'Invalid input data' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async editProfile(@Req() req, @Body() editProfileDto: EditProfileDTO) {
    try {
      const editProfile = await this.profileService.editProfile(
        +req.user.userId,
        editProfileDto,
      );
      return Response(true, 'Profile edited successfully', editProfile);
    } catch (error) {
      return Response(false, 'Failed to edit profile.', error.message);
    }
  }

  // 📌 Update Profile Picture Separately
  @Patch('profile-picture')
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
  ) {
    try {
      const userId = +req.user.userId;
      const { message } = await this.profileService.editProfilePicture(
        userId,
        file,
      );
      return { status: true, message };
    } catch (error) {
      return Response(false, 'Fail to update profile-picture', error.message);
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
  async removeProfilePicture(@Req() req) {
    try {
      const userId = +req.user.userId;
      const { message } =
        await this.profileService.removeProfilePicture(userId);
      return { success: true, message };
    } catch (error) {
      return Response(
        false,
        'Fail to remove the profile-picture',
        error.message,
      );
    }
  }

  // 📌 Request to Follow
  @Post(':id/follow')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Send a follow request' })
  @ApiResponse({ status: 201, description: 'Follow request sent.' })
  @ApiResponse({ status: 400, description: 'Follow request already sent.' })
  async requestToFollow(@Param('id') targetId: string, @Req() req) {
    try {
      const userId = +req.user.userId;
      const { message } = await this.profileService.requestToFollow(
        +targetId,
        userId,
      );
      return { status: false, message };
    } catch (error) {
      return Response(false, 'Fail to send follow request.', error);
    }
  }

  // 📌 Accept Follow Request
  @Post(':id/accept-follow')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Accept a follow request' })
  @ApiResponse({ status: 200, description: 'Follow request accepted.' })
  @ApiResponse({ status: 400, description: 'No follow request found.' })
  async acceptFollow(@Param('id') requesterId: string, @Req() req) {
    try {
      const userId = +req.user.userId;
      const { message } = await this.profileService.acceptFollowRequest(
        userId,
        +requesterId,
      );
      return { status: true, message };
    } catch (error) {
      return Response(false, 'Fail to accept the request.', error);
    }
  }

  // 📌 Cancel Follow Request
  @Post(':id/cancel-request')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Cancel a follow request' })
  @ApiResponse({ status: 200, description: 'Follow request canceled.' })
  @ApiResponse({ status: 400, description: 'No follow request found.' })
  async cancelFollowRequest(@Req() req, @Param('id') targetId: number) {
    try {
      const requesterId = req.user.userId;
      const { message } = await this.profileService.cancelFollowRequest(
        requesterId,
        +targetId,
      );
      return { status: true, message };
    } catch (error) {
      return Response(true, 'Fail to cancel follow request.', error.message);
    }
  }

  // 📌 Unfollow User
  @Post(':id/unfollow')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Unfollow a user' })
  @ApiResponse({ status: 200, description: 'Unfollowed successfully.' })
  @ApiResponse({ status: 400, description: 'You are not following this user.' })
  async unfollow(@Param('id') targetId: string, @Req() req) {
    try {
      const userId = +req.user.userId;
      const { message } = await this.profileService.unfollowUser(
        +targetId,
        userId,
      );
      return { status: false, message };
    } catch (error) {
      return Response(false, 'Fail to unfollow user.', error);
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
  async getFollowers(@Req() req) {
    try {
      const userId = +req.user.userId;
      const userFollowers = await this.profileService.followersList(userId);
      return Response(
        true,
        'Successfully retrieved followers list.',
        userFollowers,
      );
    } catch (error) {
      return Response(true, 'Fail to get followers list.', error.message);
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
  async getFollowing(@Req() req) {
    try {
      const userId = +req.user.userId;
      const userFollowing = await this.profileService.followingList(userId);
      return Response(
        true,
        'Successfully retrieved following list.',
        userFollowing,
      );
    } catch (error) {
      return Response(true, 'Fail to get following list.', error.message);
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
  @ApiResponse({
    status: 401,
    description: 'Unauthorized. Missing or invalid JWT token.',
  })
  @ApiResponse({ status: 404, description: 'User not found.' })
  @ApiResponse({ status: 500, description: 'Internal server error.' })
  async blockUser(@Param('id') targetId: string, @Req() req) {
    try {
      const userId = +req.user.userId;
      const { message } = await this.profileService.blockUser(
        userId,
        +targetId,
      );
      return { success: true, message };
    } catch (error) {
      return Response(false, 'Fail to block user.', error.message);
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
  @ApiResponse({
    status: 401,
    description: 'Unauthorized. Missing or invalid JWT token.',
  })
  @ApiResponse({ status: 404, description: 'User not found.' })
  @ApiResponse({ status: 500, description: 'Internal server error.' })
  async unblockUser(@Param('id') targetId: string, @Req() req) {
    try {
      const userId = +req.user.userId;
      const { message } = await this.profileService.unblockUser(
        userId,
        +targetId,
      );
      return { success: true, message };
    } catch (error) {
      return Response(false, 'Fail to unblock user.', error.message);
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
  @ApiResponse({
    status: 401,
    description: 'Unauthorized. Missing or invalid JWT token.',
  })
  @ApiResponse({ status: 404, description: 'User not found.' })
  async isUserBlocked(@Param('id') targetId: string, @Req() req) {
    try {
      const userId = +req.user.userId;
      const isBlocked = await this.profileService.isUserBlocked(
        userId,
        +targetId,
      );
      return { success: true, isBlocked };
    } catch (error) {
      return Response(
        false,
        'Fail to check user is blocked or not.',
        error.message,
      );
    }
  }
}
