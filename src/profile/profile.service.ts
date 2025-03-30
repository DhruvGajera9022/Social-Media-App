import {
  BadRequestException,
  ConflictException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { EditProfileDTO } from './dto/edit-profile.dto';
import { v2 as cloudinary } from 'cloudinary';
import * as fs from 'fs';
import {
  deleteFromCloudinary,
  uploadToCloudinary,
} from 'src/utils/cloudinary.util';

@Injectable()
export class ProfileService {
  constructor(private prisma: PrismaService) {
    cloudinary.config({
      cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
      api_key: process.env.CLOUDINARY_API_KEY,
      api_secret: process.env.CLOUDINARY_API_SECRET,
    });
  }

  // Get User By Id
  async getUserData(userId: number) {
    // Find user
    const user = await this.prisma.users.findUnique({
      where: { id: userId },
    });
    if (!user) throw new NotFoundException('User not found');

    return user;
  }

  // Get Profile
  async getProfile(userId: number) {
    const user = await this.prisma.users.findUnique({
      where: { id: userId },
      include: {
        _count: { select: { followers: true, following: true } },
        posts: {
          orderBy: [{ pinned: 'desc' }, { created_at: 'desc' }],
          omit: { userId: true },
        },
      },
      omit: { password: true },
    });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    return user;
  }

  // Edit Profile
  async editProfile(userId: number, editProfileDto: EditProfileDTO) {
    const { firstName, lastName, email, is_private } = editProfileDto;
    const convertIsPrivate =
      typeof is_private === 'string' ? is_private === 'true' : !!is_private;

    try {
      // Find user
      const user = await this.getUserData(userId);

      // Update user
      const updateUser = await this.prisma.users.update({
        where: { id: user.id },
        data: {
          firstName,
          lastName,
          email,
          is_private: convertIsPrivate,
        },
        omit: { password: true },
      });

      return updateUser;
    } catch (error) {
      throw new InternalServerErrorException('Error in edit profile', error);
    }
  }

  // Edit Profile Picture
  async editProfilePicture(userId: number, file?: Express.Multer.File) {
    try {
      const user = await this.getUserData(userId);

      // Handle file upload if present
      let file_url = user.profile_picture; // Keep old picture if no new upload
      if (file) {
        try {
          const uploadResult = await uploadToCloudinary(file.path);
          file_url = uploadResult.secure_url;
        } finally {
          if (file?.path && fs.existsSync(file.path)) {
            await fs.promises.unlink(file.path); // Remove local file
          }
        }
      }

      await this.prisma.users.update({
        where: { id: user.id },
        data: {
          profile_picture: file_url,
        },
        omit: { password: true },
      });
      return { message: 'Profile picture updated.' };
    } catch (error) {
      // Ensure local file is removed if an error occurs
      if (file?.path && fs.existsSync(file.path)) {
        await fs.promises.unlink(file.path);
      }
      throw new InternalServerErrorException(
        'Error in edit profile-picture',
        error,
      );
    }
  }

  // Remove Profile Picture
  async removeProfilePicture(userId: number) {
    try {
      const user = await this.getUserData(userId);

      await deleteFromCloudinary(user.profile_picture);

      await this.prisma.users.update({
        where: { id: user.id },
        data: { profile_picture: '' },
      });

      return { message: 'Profile-Picture removed.' };
    } catch (error) {
      throw new InternalServerErrorException(error);
    }
  }

  // Request to Follow
  async requestToFollow(targetId: number, userId: number) {
    try {
      const targetUser = await this.getUserData(userId);

      if (!targetUser.is_private) {
        // If public, follow directly
        const existingFollow = await this.prisma.followers.findUnique({
          where: {
            followerId_followingId: {
              followerId: userId,
              followingId: targetId,
            },
          },
        });
        if (existingFollow) {
          throw new BadRequestException('You are already following this user.');
        }

        await this.prisma.followers.create({
          data: { followerId: userId, followingId: targetId },
        });

        return { message: 'You are now following this user.' };
      }

      // Check if a request already exists
      const existingRequest = await this.prisma.followRequests.findUnique({
        where: { requesterId_targetId: { requesterId: userId, targetId } },
      });
      if (existingRequest) {
        throw new BadRequestException('Follow request already sent.');
      }

      // Create follow request
      await this.prisma.followRequests.create({
        data: { requesterId: userId, targetId },
      });

      return { message: 'Follow request sent.' };
    } catch (error) {
      throw new InternalServerErrorException(error);
    }
  }

  // Accept Follow Request
  async acceptFollowRequest(targetId: number, userId: number) {
    try {
      // Check if request exists
      const request = await this.prisma.followRequests.findUnique({
        where: { requesterId_targetId: { requesterId: userId, targetId } },
      });
      if (!request) {
        throw new BadRequestException('No follow request found.');
      }

      await this.prisma.$transaction([
        // Move request to followers
        this.prisma.followers.create({
          data: { followerId: userId, followingId: targetId },
        }),
        // Delete request from follow_requests
        this.prisma.followRequests.delete({
          where: { id: request.id },
        }),
      ]);

      return { message: 'Follow request accepted.' };
    } catch (error) {
      throw new InternalServerErrorException(error);
    }
  }

  // Cancel Follow Request
  async cancelFollowRequest(requesterId: number, targetId: number) {
    try {
      const followRequest = await this.prisma.followRequests.findFirst({
        where: { requesterId, targetId },
      });
      if (!followRequest) {
        throw new BadRequestException('No follow request found.');
      }

      await this.prisma.followRequests.delete({
        where: { id: followRequest.id },
      });
      return { message: 'Follow request canceled successfully.' };
    } catch (error) {
      throw new InternalServerErrorException(error);
    }
  }

  // Unfollow user
  async unfollowUser(targetId: number, userId: number) {
    try {
      await this.prisma.followers.deleteMany({
        where: { followerId: userId, followingId: targetId },
      });

      return { message: 'Unfollowed successfully.' };
    } catch (error) {
      throw new InternalServerErrorException(error);
    }
  }
}
