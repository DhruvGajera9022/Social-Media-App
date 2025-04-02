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
import { Prisma } from '@prisma/client';

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
    try {
      // Find user
      const user = await this.prisma.users.findUnique({
        where: { id: userId },
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          is_private: true,
          profile_picture: true,
          is_active: true,
        },
      });
      if (!user) {
        throw new NotFoundException(`User with ID ${userId} not found`);
      }

      if (!user.is_active) {
        throw new BadRequestException('This account has been deactivated');
      }

      return user;
    } catch (error) {
      throw new InternalServerErrorException(
        'Failed to retrieve user data',
        error.message,
      );
    }
  }

  // Get Profile with posts and follower counts
  async getProfile(userId: number) {
    try {
      const user = await this.prisma.users.findUnique({
        where: { id: userId, is_active: true },
        include: {
          _count: { select: { followers: true, following: true } },
          posts: {
            orderBy: [{ pinned: 'desc' }, { created_at: 'desc' }],
            select: {
              id: true,
              title: true,
              content: true,
              created_at: true,
              pinned: true,
            },
          },
        },
        omit: { password: true },
      });
      if (!user) {
        throw new NotFoundException(`User with ID ${userId} not found`);
      }
      return user;
    } catch (error) {
      throw new InternalServerErrorException(
        'Failed to retrieve profile data',
        error.message,
      );
    }
  }

  // Edit Profile
  async editProfile(userId: number, editProfileDto: EditProfileDTO) {
    try {
      await this.getUserData(userId); // Verify user exists and is active

      const { firstName, lastName, email, is_private } = editProfileDto;

      return await this.prisma.users.update({
        where: { id: userId },
        data: { firstName, lastName, email, is_private: Boolean(is_private) },
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          is_private: true,
        },
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new ConflictException('Email is already in use');
      }
      throw new InternalServerErrorException('Failed to update profile');
    }
  }

  // Edit Profile Picture
  async editProfilePicture(userId: number, file?: Express.Multer.File) {
    let localFilePath = file?.path;
    try {
      const user = await this.getUserData(userId);
      let file_url = user.profile_picture; // Keep existing picture if no new upload

      if (file) {
        const uploadResult = await uploadToCloudinary(file.path);
        file_url = uploadResult.secure_url;

        // Delete old profile picture from Cloudinary if it exists
        if (user.profile_picture) {
          await deleteFromCloudinary(user.profile_picture).catch((err) => {
            console.error('Failed to delete old profile picture:', err);
          });
        }
      }

      await this.prisma.users.update({
        where: { id: user.id },
        data: {
          profile_picture: file_url,
        },
      });
      return { message: 'Profile picture updated successfully' };
    } catch (error) {
      throw new InternalServerErrorException(
        'Failed to update profile picture',
        error.message,
      );
    } finally {
      // Clean up the local file regardless of outcome
      if (localFilePath && fs.existsSync(localFilePath)) {
        await fs.promises.unlink(localFilePath).catch((err) => {
          console.error('Failed to delete temporary file:', err);
        });
      }
    }
  }

  // Remove Profile Picture
  async removeProfilePicture(userId: number) {
    try {
      const user = await this.getUserData(userId);

      if (!user.profile_picture) {
        return { message: 'No profile picture to remove' };
      }

      await deleteFromCloudinary(user.profile_picture);

      await this.prisma.users.update({
        where: { id: user.id },
        data: { profile_picture: '' },
      });

      return { message: 'Profile picture removed successfully' };
    } catch (error) {
      throw new InternalServerErrorException(
        'Failed to remove profile picture',
        error,
      );
    }
  }

  // Request to Follow
  async requestToFollow(targetId: number, userId: number) {
    try {
      // Verify both users exist and are active
      await this.getUserData(userId);
      const targetUser = await this.getUserData(targetId);

      // Check if user is trying to follow themselves
      if (userId === targetId) {
        throw new BadRequestException('You cannot follow yourself');
      }

      // Check if user is blocked by target
      const isBlocked = await this.isUserBlocked(targetId, userId);
      if (isBlocked) {
        throw new BadRequestException('You cannot follow this user');
      }

      // Handle based on target user's privacy setting
      if (!targetUser.is_private) {
        // For public profiles, direct follow
        return await this.prisma.$transaction(async (tx) => {
          const existingFollow = await tx.followers.findUnique({
            where: {
              followerId_followingId: {
                followerId: userId,
                followingId: targetId,
              },
            },
          });
          if (existingFollow) {
            throw new BadRequestException(
              'You are already following this user',
            );
          }

          await tx.followers.create({
            data: { followerId: userId, followingId: targetId },
          });

          return { message: 'You are now following this user' };
        });
      } else {
        // For private profiles, create follow request
        return await this.prisma.$transaction(async (tx) => {
          // Check if a request already exists
          const existingRequest = await tx.followRequests.findUnique({
            where: {
              requesterId_targetId: {
                requesterId: userId,
                targetId,
              },
            },
          });
          if (existingRequest) {
            throw new BadRequestException('Follow request already sent');
          }

          // Create follow request
          await tx.followRequests.create({
            data: { requesterId: userId, targetId },
          });

          return { message: 'Follow request sent' };
        });
      }
    } catch (error) {
      throw new InternalServerErrorException(
        'Failed to process follow request',
        error.message,
      );
    }
  }

  // Accept Follow Request
  async acceptFollowRequest(requesterId: number, targetId: number) {
    try {
      // Verify target is trying to accept request for themselves
      await this.getUserData(targetId);
      await this.getUserData(requesterId);

      return await this.prisma.$transaction(async (tx) => {
        // Check if request exists
        const request = await tx.followRequests.findUnique({
          where: {
            requesterId_targetId: {
              requesterId,
              targetId,
            },
          },
        });

        if (!request) {
          throw new BadRequestException('No follow request found');
        }

        // Create follower relationship
        await tx.followers.create({
          data: { followerId: requesterId, followingId: targetId },
        });

        // Delete request
        await tx.followRequests.delete({
          where: { id: request.id },
        });

        return { message: 'Follow request accepted' };
      });
    } catch (error) {
      throw new InternalServerErrorException(
        'Failed to accept follow request',
        error.message,
      );
    }
  }

  // Cancel Follow Request
  async cancelFollowRequest(requesterId: number, targetId: number) {
    try {
      await this.getUserData(requesterId);
      await this.getUserData(targetId);

      const followRequest = await this.prisma.followRequests.findFirst({
        where: { requesterId, targetId },
      });
      if (!followRequest) {
        throw new BadRequestException('No follow request found');
      }

      await this.prisma.followRequests.delete({
        where: { id: followRequest.id },
      });

      return { message: 'Follow request canceled successfully' };
    } catch (error) {
      throw new InternalServerErrorException(
        'Failed to cancel follow request',
        error,
      );
    }
  }

  // Unfollow User
  async unfollowUser(targetId: number, userId: number) {
    try {
      await this.getUserData(userId);
      await this.getUserData(targetId);

      const deleteResult = await this.prisma.followers.deleteMany({
        where: { followerId: userId, followingId: targetId },
      });

      if (deleteResult.count === 0) {
        return { message: 'You are not following this user' };
      }

      return { message: 'Unfollowed successfully' };
    } catch (error) {
      throw new InternalServerErrorException('Failed to unfollow user', error);
    }
  }

  // Followers List
  async followersList(userId: number) {
    try {
      await this.getUserData(userId);

      // Get blocked user IDs
      const blockedUsers = await this.prisma.blockList.findMany({
        where: { blockerId: userId },
        select: { blockedId: true },
      });

      const blockedIds = blockedUsers.map((b) => b.blockedId);

      // Get total count
      const totalCount = await this.prisma.followers.count({
        where: { followingId: userId, followerId: { notIn: blockedIds } },
      });

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
      });

      // Transform the response for better API consumption
      const formattedFollowers = followers.map((f) => ({
        id: f.follower.id,
        firstName: f.follower.firstName,
        lastName: f.follower.lastName,
        profile_picture: f.follower.profile_picture,
      }));

      return {
        followers: formattedFollowers,
        total: totalCount,
      };
    } catch (error) {
      throw new InternalServerErrorException(
        'Failed to retrieve followers list',
        error,
      );
    }
  }

  // Following List
  async followingList(userId: number) {
    try {
      await this.getUserData(userId);

      // Get total count
      const totalCount = await this.prisma.followers.count({
        where: { followerId: userId },
      });

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
      });

      // Transform the response for better API consumption
      const formattedFollowing = following.map((f) => ({
        id: f.following.id,
        firstName: f.following.firstName,
        lastName: f.following.lastName,
        profile_picture: f.following.profile_picture,
      }));

      return {
        following: formattedFollowing,
        total: totalCount,
      };
    } catch (error) {
      throw new InternalServerErrorException(
        'Failed to retrieve following list',
        error.message,
      );
    }
  }

  // Get Follow Requests
  async getFollowRequests(userId: number) {
    try {
      await this.getUserData(userId);

      // Get total count for pagination info
      const totalCount = await this.prisma.followRequests.count({
        where: { targetId: userId },
      });

      const requests = await this.prisma.followRequests.findMany({
        where: { targetId: userId },
        include: {
          requester: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              profile_picture: true,
            },
          },
        },
      });

      // Transform the response for better API consumption
      const formattedRequests = requests.map((r) => ({
        requestId: r.id,
        user: {
          id: r.requester.id,
          firstName: r.requester.firstName,
          lastName: r.requester.lastName,
          profile_picture: r.requester.profile_picture,
        },
      }));

      return {
        requests: formattedRequests,
        total: totalCount,
      };
    } catch (error) {
      throw new InternalServerErrorException(
        'Failed to retrieve follow requests',
        error.message,
      );
    }
  }

  // Block User
  async blockUser(userId: number, targetId: number) {
    try {
      await this.getUserData(userId);
      await this.getUserData(targetId);

      if (userId === targetId) {
        throw new BadRequestException('You cannot block yourself');
      }

      return await this.prisma.$transaction(async (tx) => {
        // Check if already blocked
        const existingBlock = await tx.blockList.findFirst({
          where: { blockerId: userId, blockedId: targetId },
        });

        if (existingBlock) {
          throw new ConflictException('User is already blocked');
        }

        // Block the user
        await tx.blockList.create({
          data: { blockerId: userId, blockedId: targetId },
        });

        // Remove any follow relationships in both directions
        await tx.followers.deleteMany({
          where: {
            OR: [
              { followerId: userId, followingId: targetId },
              { followerId: targetId, followingId: userId },
            ],
          },
        });

        // Remove any pending follow requests in both directions
        await tx.followRequests.deleteMany({
          where: {
            OR: [
              { requesterId: userId, targetId },
              { requesterId: targetId, targetId: userId },
            ],
          },
        });

        return { message: 'User blocked successfully' };
      });
    } catch (error) {
      throw new InternalServerErrorException(
        'Failed to block user',
        error.message,
      );
    }
  }

  // Unblock User
  async unblockUser(userId: number, targetId: number) {
    try {
      await this.getUserData(userId);

      const deletedBlock = await this.prisma.blockList.deleteMany({
        where: { blockerId: userId, blockedId: targetId },
      });

      if (deletedBlock.count === 0) {
        return { message: 'User is not blocked' };
      }

      return { message: 'User unblocked successfully' };
    } catch (error) {
      throw new InternalServerErrorException(
        'Failed to unblock user',
        error.message,
      );
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
      throw new InternalServerErrorException(
        'Failed to check block status',
        error.message,
      );
    }
  }

  // Get Blocked Users List
  async getBlockedUsers(userId: number) {
    try {
      await this.getUserData(userId);

      // Get total count
      const totalCount = await this.prisma.blockList.count({
        where: { blockerId: userId },
      });

      const blockedUsers = await this.prisma.blockList.findMany({
        where: { blockerId: userId },
        include: {
          blocked: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              profile_picture: true,
            },
          },
        },
      });

      // Transform the response for better API consumption
      const formattedBlockedUsers = blockedUsers.map((b) => ({
        id: b.blocked.id,
        firstName: b.blocked.firstName,
        lastName: b.blocked.lastName,
        profile_picture: b.blocked.profile_picture,
      }));

      return {
        blockedUsers: formattedBlockedUsers,
        total: totalCount,
      };
    } catch (error) {
      throw new InternalServerErrorException(
        'Failed to retrieve blocked users list',
        error.message,
      );
    }
  }

  // Mutual Followers
  async getMutualFollowers(userId: number, targetId: number) {
    try {
      await this.getUserData(userId);
      await this.getUserData(targetId);

      // Get mutual followers IDs
      const userFollowerIds = await this.prisma.followers.findMany({
        where: { followingId: userId },
        select: { followerId: true },
      });

      const targetFollowerIds = await this.prisma.followers.findMany({
        where: { followingId: targetId },
        select: { followerId: true },
      });

      const userFollowerSet = new Set(userFollowerIds.map((f) => f.followerId));
      const mutualFollowerIds = targetFollowerIds
        .filter((f) => userFollowerSet.has(f.followerId))
        .map((f) => f.followerId);

      const totalCount = mutualFollowerIds.length;

      // Get user details for mutual followers with pagination
      const mutualFollowers = await this.prisma.users.findMany({
        where: { id: { in: mutualFollowerIds } },
        select: {
          id: true,
          firstName: true,
          lastName: true,
          profile_picture: true,
        },
      });

      return { mutualFollowers, totalCount };
    } catch (error) {
      throw new InternalServerErrorException(
        'Failed to retrieve mutual followers',
        error,
      );
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

      return { message: 'Account deactivated successfully' };
    } catch (error) {
      throw new InternalServerErrorException(
        'Failed to deactivate account',
        error,
      );
    }
  }

  // Reactivate Account
  async reactivateAccount(userId: number) {
    try {
      // Special case to check inactive accounts
      const user = await this.prisma.users.findUnique({
        where: { id: userId },
        select: { id: true, is_active: true },
      });

      if (!user) {
        throw new NotFoundException(`User with ID ${userId} not found`);
      }

      if (user.is_active) {
        return { message: 'Account is already active' };
      }

      await this.prisma.users.update({
        where: { id: userId },
        data: { is_active: true },
      });

      return { message: 'Account reactivated successfully' };
    } catch (error) {
      throw new InternalServerErrorException('Failed to reactivate account');
    }
  }

  // Search User
  async searchUser(userId: number, query: string) {
    try {
      await this.getUserData(userId);

      const trimmedQuery = query.trim();
      if (!trimmedQuery) {
        throw new BadRequestException('Search query cannot be empty');
      }

      // Get blocked users (both ways)
      const blockedByMe = await this.prisma.blockList.findMany({
        where: { blockerId: userId },
        select: { blockedId: true },
      });

      const blockedMe = await this.prisma.blockList.findMany({
        where: { blockedId: userId },
        select: { blockerId: true },
      });

      const blockedIds = [
        ...blockedByMe.map((b) => b.blockedId),
        ...blockedMe.map((b) => b.blockerId),
      ];

      // First get connections (followers/following)
      const followersAndFollowing = await this.prisma.users.findMany({
        where: {
          AND: [
            {
              OR: [
                { firstName: { contains: trimmedQuery, mode: 'insensitive' } },
                { lastName: { contains: trimmedQuery, mode: 'insensitive' } },
              ],
            },
            { id: { notIn: blockedIds } }, // Exclude blocked users
            { is_active: true }, // Only active users
            {
              OR: [
                // User follows them
                { followers: { some: { followerId: userId } } },
                // They follow the user
                { following: { some: { followingId: userId } } },
              ],
            },
          ],
        },
        select: {
          id: true,
          firstName: true,
          lastName: true,
          profile_picture: true,
          is_private: true,
          _count: { select: { followers: true, following: true } },
        },
      });

      // Count total matches
      const totalConnectionsCount = await this.prisma.users.count({
        where: {
          AND: [
            {
              OR: [
                { firstName: { contains: trimmedQuery, mode: 'insensitive' } },
                { lastName: { contains: trimmedQuery, mode: 'insensitive' } },
              ],
            },
            { id: { notIn: blockedIds } },
            { is_active: true },
            {
              OR: [
                { followers: { some: { followerId: userId } } },
                { following: { some: { followingId: userId } } },
              ],
            },
          ],
        },
      });

      // Check if we need to fetch more users beyond connections
      let results = followersAndFollowing;
      let totalCount = totalConnectionsCount;

      // Get other users who are not in followers/following
      const otherUsers = await this.prisma.users.findMany({
        where: {
          AND: [
            {
              OR: [
                {
                  firstName: { contains: trimmedQuery, mode: 'insensitive' },
                },
                { lastName: { contains: trimmedQuery, mode: 'insensitive' } },
              ],
            },
            {
              id: {
                notIn: [
                  ...blockedIds,
                  ...followersAndFollowing.map((u) => u.id),
                ],
              },
            },
            { is_active: true },
          ],
        },
        select: {
          id: true,
          firstName: true,
          lastName: true,
          profile_picture: true,
          is_private: true,
          _count: { select: { followers: true, following: true } },
        },
      });

      // Count total other matches for pagination
      const totalOtherCount = await this.prisma.users.count({
        where: {
          AND: [
            {
              OR: [
                {
                  firstName: { contains: trimmedQuery, mode: 'insensitive' },
                },
                { lastName: { contains: trimmedQuery, mode: 'insensitive' } },
              ],
            },
            {
              id: {
                notIn: [
                  ...blockedIds,
                  ...followersAndFollowing.map((u) => u.id),
                ],
              },
            },
            { is_active: true },
          ],
        },
      });

      results = [...followersAndFollowing, ...otherUsers];
      totalCount = totalConnectionsCount + totalOtherCount;

      // Add relationship info to results
      const enhancedResults = await Promise.all(
        results.map(async (user) => {
          const isFollowing = await this.prisma.followers.findFirst({
            where: { followerId: userId, followingId: user.id },
          });

          const followRequestSent = await this.prisma.followRequests.findFirst({
            where: { requesterId: userId, targetId: user.id },
          });

          return {
            ...user,
            isFollowing: !!isFollowing,
            followRequestSent: !!followRequestSent,
          };
        }),
      );

      return {
        users: enhancedResults,
        total: totalCount,
      };
    } catch (error) {
      throw new InternalServerErrorException(
        'Failed to search users',
        error.message,
      );
    }
  }
}
