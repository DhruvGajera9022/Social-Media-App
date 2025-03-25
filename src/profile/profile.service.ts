import {
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { EditProfileDTO } from './dto/edit-profile.dto';
import { v2 as cloudinary } from 'cloudinary';
import * as fs from 'fs';
import { uploadToCloudinary } from 'src/utils/cloudinary.util';

@Injectable()
export class ProfileService {
  constructor(private prisma: PrismaService) {
    cloudinary.config({
      cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
      api_key: process.env.CLOUDINARY_API_KEY,
      api_secret: process.env.CLOUDINARY_API_SECRET,
    });
  }

  // Get Profile
  async getProfile(userId: number) {
    const user = await this.prisma.users.findUnique({
      where: { id: userId },
      include: { posts: true },
    });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    const { password: _, ...result } = user;
    return result;
  }

  // Edit Profile
  async editProfile(
    userId: number,
    editProfileDto: EditProfileDTO,
    file: Express.Multer.File,
  ) {
    const { firstName, lastName, email } = editProfileDto;

    try {
      const user = await this.prisma.users.findUnique({
        where: { id: userId },
      });
      if (!user) {
        throw new NotFoundException('User not found');
      }

      const uploadResult = await uploadToCloudinary(file.path);
      await fs.promises.unlink(file.path);
      const file_url = uploadResult.secure_url;

      const updateUser = await this.prisma.users.update({
        where: { id: userId },
        data: {
          firstName,
          lastName,
          email,
          profile_picture: file_url,
        },
      });

      const { password: _, ...result } = updateUser;
      return result;
    } catch (error) {
      // Removing if error occurs
      if (file.path && fs.existsSync(file.path)) {
        await fs.unlinkSync(file.path);
      }
      throw new InternalServerErrorException('Error in edit profile', error);
    }
  }
}
