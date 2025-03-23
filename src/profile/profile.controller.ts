import {
  Body,
  Controller,
  Get,
  Put,
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

@Controller('profile')
export class ProfileController {
  constructor(private readonly profileService: ProfileService) {}

  // Get profile
  @Get()
  @UseGuards(JwtAuthGuard)
  async getProfile(@Req() req) {
    return this.profileService.getProfile(+req.user.userId);
  }

  // Edit Profile
  @Put()
  @UseInterceptors(
    FileInterceptor('profile_picture', {
      storage: diskStorage({
        destination: './uploads',
        filename: (req, file, callback) => {
          const uniqueSuffix =
            Date.now() + '-' + Math.round(Math.random() * 1e9);
          const ext = extname(file.originalname);
          const fileName = `${uniqueSuffix}${ext}`;
          callback(null, fileName);
        },
      }),
    }),
  )
  @UseGuards(JwtAuthGuard)
  async editProfile(
    @Req() req,
    @Body() editProfileDto: EditProfileDTO,
    @UploadedFile() file: Express.Multer.File,
  ) {
    return this.profileService.editProfile(
      +req.user.userId,
      editProfileDto,
      file,
    );
  }
}
