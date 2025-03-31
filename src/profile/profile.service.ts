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
      const targetUser = await this.getUserData(targetId);

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

  // Unfollow User
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

  // Followers List
  async followersList(userId: number) {
    try {
      // Get blocked user
      const blockedUsers = await this.prisma.blockList.findMany({
        where: { blockerId: userId },
        select: { blockedId: true },
      });

      const blockedIds = blockedUsers.map((b) => b.blockedId);

      const followers = await this.prisma.followers.findMany({
        where: { followingId: userId, followerId: { notIn: blockedIds } },
        include: {
          follower: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              profile_picture: true,
            },
          },
        },
        omit: { id: true, followerId: true, followingId: true },
      });
      if (followers.length === 0) {
        throw new NotFoundException('No followers found.');
      }

      return followers;
    } catch (error) {
      throw new InternalServerErrorException(error);
    }
  }

  // Following List
  async followingList(userId: number) {
    try {
      const following = await this.prisma.followers.findMany({
        where: { followerId: userId },
        include: {
          following: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              profile_picture: true,
            },
          },
        },
        omit: { id: true, followerId: true, followingId: true },
      });
      if (following.length === 0) {
        throw new NotFoundException('No following found.');
      }

      return following;
    } catch (error) {
      throw new InternalServerErrorException(error);
    }
  }

  // Block User
  async blockUser(userId: number, targetId: number) {
    try {
      const existingBlock = await this.prisma.blockList.findFirst({
        where: { blockerId: userId, blockedId: targetId },
      });
      if (existingBlock) {
        throw new ConflictException('User is already blocked.');
      }

      await this.prisma.blockList.create({
        data: { blockerId: userId, blockedId: targetId },
      });

      return { message: 'User blocked.' };
    } catch (error) {
      throw new InternalServerErrorException(error);
    }
  }

  // Unblock User
  async unblockUser(userId: number, targetId: number) {
    try {
      const deletedBlock = await this.prisma.blockList.deleteMany({
        where: { blockerId: userId, blockedId: targetId },
      });
      if (!deletedBlock.count) {
        throw new NotFoundException('User is not blocked.');
      }

      return { message: 'User unblocked successfully' };
    } catch (error) {
      throw new InternalServerErrorException(error);
    }
  }

  // Check if user id blocked
  async isUserBlocked(userId: number, targetId: number): Promise<boolean> {
    try {
      const block = await this.prisma.blockList.findFirst({
        where: { blockerId: userId, blockedId: targetId },
      });

      return !!block;
    } catch (error) {
      throw new InternalServerErrorException(error);
    }
  }

  // Mutual Followers
  async getMutualFollowers(userId: number, targetId: number) {
    try {
      // Fetch followers of userId
      const userFollowers = await this.prisma.users.findUnique({
        where: { id: userId },
        include: { followers: { select: { id: true } } },
      });

      // Fetch followers of targetId
      const targetFollowers = await this.prisma.users.findUnique({
        where: { id: userId },
        include: { followers: { select: { id: true } } },
      });

      if (!userFollowers || !targetFollowers) {
        throw new NotFoundException('One or both users not found.');
      }

      // Convert followers to sets for easy comparison
      const userFollowerIds = new Set(userFollowers.followers.map((f) => f.id));
      const mutualFriends = targetFollowers.followers.filter((f) =>
        userFollowerIds.has(f.id),
      );

      return mutualFriends;
    } catch (error) {
      throw new InternalServerErrorException(error);
    }
  }

  // Deactivate Account
  async deactivateAccount(userId: number) {
    try {
      const user = await this.getUserData(userId);
      await this.prisma.users.update({
        where: { id: user.id },
        data: { is_active: false },
      });

      return { message: 'Account deactivated successfully.' };
    } catch (error) {
      throw new InternalServerErrorException(error);
    }
  }

  // Search User
  async searchUser(query: string) {
    try {
      const user = await this.prisma.users.findMany({
        where: {
          OR: [
            { firstName: { contains: query, mode: 'insensitive' } },
            { lastName: { contains: query, mode: 'insensitive' } },
          ],
        },
        select: {
          id: true,
          firstName: true,
          lastName: true,
          profile_picture: true,
        },
        take: 10,
      });

      return user;
    } catch (error) {
      throw new InternalServerErrorException(error);
    }
  }
}
