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
  @ApiOperation({ summary: 'Get user profile' })
  @ApiResponse({ status: 200, description: 'Profile retrieved successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @Get()
  @UseGuards(JwtAuthGuard)
  async getProfile(@Req() req) {
    try {
      const profile = await this.profileService.getProfile(+req.user.userId);
      return Response(true, 'Profile fetched successfully', profile);
    } catch (error) {
      return Response(false, 'Failed to fetch profile data.', error.message);
    }
  }

  // Edit Profile
  @ApiOperation({ summary: 'Edit user profile' })
  @ApiResponse({ status: 200, description: 'Profile updated successfully' })
  @ApiResponse({ status: 400, description: 'Invalid input data' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @UseGuards(JwtAuthGuard)
  @Patch()
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
  @ApiOperation({ summary: 'Edit user profile-picture' })
  @ApiResponse({
    status: 200,
    description: 'Profile-Picture updated successfully',
  })
  @ApiResponse({ status: 400, description: 'Invalid input data' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @UseGuards(JwtAuthGuard)
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

  // 📌 Request to Follow
  @ApiOperation({ summary: 'Send a follow request' })
  @ApiResponse({ status: 201, description: 'Follow request sent.' })
  @ApiResponse({ status: 400, description: 'Follow request already sent.' })
  @UseGuards(JwtAuthGuard)
  @Post(':id/follow')
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
  @ApiOperation({ summary: 'Accept a follow request' })
  @ApiResponse({ status: 200, description: 'Follow request accepted.' })
  @ApiResponse({ status: 400, description: 'No follow request found.' })
  @UseGuards(JwtAuthGuard)
  @Post(':id/accept-follow')
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
  @ApiOperation({ summary: 'Cancel a follow request' })
  @ApiResponse({ status: 200, description: 'Follow request canceled.' })
  @ApiResponse({ status: 400, description: 'No follow request found.' })
  @UseGuards(JwtAuthGuard)
  @Post(':id/cancel-request')
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
  @ApiOperation({ summary: 'Unfollow a user' })
  @ApiResponse({ status: 200, description: 'Unfollowed successfully.' })
  @ApiResponse({ status: 400, description: 'You are not following this user.' })
  @UseGuards(JwtAuthGuard)
  @Post(':id/unfollow')
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
}
