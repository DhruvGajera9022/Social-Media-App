import {
  Body,
  Controller,
  Get,
  Patch,
  Req,
  UploadedFile,
  UseGuards,
  UseInterceptors,
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

@ApiTags('Profile')
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
  async editProfile(
    @Req() req,
    @Body() editProfileDto: EditProfileDTO,
    @UploadedFile() file: Express.Multer.File,
  ) {
    try {
      const editProfile = await this.profileService.editProfile(
        +req.user.userId,
        editProfileDto,
        file,
      );
      return Response(true, 'Profile edited successfully', editProfile);
    } catch (error) {
      return Response(false, 'Failed to edit profile.', error.message);
    }
  }
}
