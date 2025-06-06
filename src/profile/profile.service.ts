import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
  UnauthorizedException,
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
import * as QRCode from 'qrcode';
import { authenticator } from 'otplib';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';
import { cacheKeys } from 'src/utils/cacheKeys.util';
import { NotificationsService } from 'src/notifications/notifications.service';

@Injectable()
export class ProfileService {
  constructor(
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
    private readonly prisma: PrismaService,
    private readonly notificationsService: NotificationsService,
  ) {
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
          username: true,
          email: true,
          is_private: true,
          profile_picture: true,
          is_active: true,
          is_2fa: true,
          secret_2fa: true,
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
    const cacheProfileKey = cacheKeys.userProfileWithPosts(userId);
    try {
      const cachedProfileData = await this.cacheManager.get(cacheProfileKey);
      if (cachedProfileData) {
        return cachedProfileData;
      }

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
              media_url: true,
              pinned: true,
            },
          },
        },
        omit: { password: true },
      });
      if (!user) {
        throw new NotFoundException(`User with ID ${userId} not found`);
      }

      this.cacheManager.set(cacheProfileKey, user);
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
    const cacheProfileKey = cacheKeys.userProfileWithPosts(userId);
    try {
      await this.getUserData(userId); // Verify user exists and is active

      const { username, firstName, lastName, email, is_private } =
        editProfileDto;

      const updatedUser = await this.prisma.users.update({
        where: { id: userId },
        data: {
          username,
          firstName,
          lastName,
          email,
          is_private: Boolean(is_private),
        },
        select: {
          id: true,
          username: true,
          firstName: true,
          lastName: true,
          email: true,
          is_private: true,
          _count: { select: { followers: true, following: true } },
        },
      });

      // Update cache after profile change (exclude posts)
      this.cacheManager.set(cacheProfileKey, updatedUser);

      return updatedUser;
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
    const cacheProfileKey = cacheKeys.userProfileWithPosts(userId);
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

      const updatedUser = this.prisma.users.update({
        where: { id: user.id },
        data: {
          profile_picture: file_url,
        },
        select: {
          id: true,
          username: true,
          firstName: true,
          lastName: true,
          email: true,
          is_private: true,
          profile_picture: true,
          _count: { select: { followers: true, following: true } },
        },
      });

      // Refresh Redis cache
      this.cacheManager.set(cacheProfileKey, updatedUser);
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
    const cacheProfileKey = cacheKeys.userProfileWithPosts(userId);
    try {
      const user = await this.getUserData(userId);

      if (!user.profile_picture) {
        return { message: 'No profile picture to remove' };
      }

      await deleteFromCloudinary(user.profile_picture);

      const updatedUser = await this.prisma.users.update({
        where: { id: user.id },
        data: { profile_picture: '' },
        select: {
          id: true,
          username: true,
          firstName: true,
          lastName: true,
          email: true,
          is_private: true,
          profile_picture: true,
          _count: { select: { followers: true, following: true } },
        },
      });

      // Refresh Redis cache
      this.cacheManager.set(cacheProfileKey, updatedUser);
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

      await this.notificationsService.createFollowNotification(
        userId,
        targetId,
      );

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
    const cacheFollowersKey = cacheKeys.followersList(userId);
    try {
      // Check cache first
      const cachedFollowerData = await this.cacheManager.get(cacheFollowersKey);
      if (cachedFollowerData) return cachedFollowerData;

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
              username: true,
              profile_picture: true,
            },
          },
        },
      });

      // Transform the response for better API consumption
      const formattedFollowers = followers.map((f) => ({
        id: f.follower.id,
        username: f.follower.username,
        profile_picture: f.follower.profile_picture,
      }));

      const result = { followers: formattedFollowers, total: totalCount };

      this.cacheManager.set(cacheFollowersKey, result);

      return result;
    } catch (error) {
      throw new InternalServerErrorException(
        'Failed to retrieve followers list',
        error,
      );
    }
  }

  // Following List
  async followingList(userId: number) {
    const cacheFollowingKey = cacheKeys.followingList(userId);

    // Check cache first
    try {
      const cachedFollowingData =
        await this.cacheManager.get(cacheFollowingKey);
      if (cachedFollowingData) return cachedFollowingData;

      // Get user data to ensure the user exists
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
              username: true,
              profile_picture: true,
            },
          },
        },
      });

      // Transform the response for better API consumption
      const formattedFollowing = following.map((f) => ({
        id: f.following.id,
        username: f.following.username,
        profile_picture: f.following.profile_picture,
      }));

      const result = {
        following: formattedFollowing,
        total: totalCount,
      };

      this.cacheManager.set(cacheFollowingKey, result);

      return result;
    } catch (error) {
      console.error('Error in followingList:', error);
      throw new InternalServerErrorException(
        'Failed to retrieve following list',
        error.message,
      );
    }
  }

  // Get Follow Requests
  async getFollowRequests(userId: number) {
    const cacheFollowRequestKey = cacheKeys.followRequests(userId);
    try {
      const cachedFollowRequestData = await this.cacheManager.get(
        cacheFollowRequestKey,
      );
      if (cachedFollowRequestData) return cachedFollowRequestData;

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
              username: true,
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
          username: r.requester.username,
          profile_picture: r.requester.profile_picture,
        },
      }));

      const result = {
        requests: formattedRequests,
        total: totalCount,
      };
      this.cacheManager.set(cacheFollowRequestKey, result);
      return result;
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
    const cacheBlockedUserKey = cacheKeys.blockedList(userId);
    try {
      const cachedBlockedUsersData =
        await this.cacheManager.get(cacheBlockedUserKey);
      if (cachedBlockedUsersData) return cachedBlockedUsersData;

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
              username: true,
              profile_picture: true,
            },
          },
        },
      });

      // Transform the response for better API consumption
      const formattedBlockedUsers = blockedUsers.map((b) => ({
        id: b.blocked.id,
        username: b.blocked.username,
        profile_picture: b.blocked.profile_picture,
      }));

      const result = {
        blockedUsers: formattedBlockedUsers,
        total: totalCount,
      };

      this.cacheManager.set(cacheBlockedUserKey, result);
      return result;
    } catch (error) {
      throw new InternalServerErrorException(
        'Failed to retrieve blocked users list',
        error.message,
      );
    }
  }

  // Mutual Followers
  async getMutualFollowers(userId: number, targetId: number) {
    const cacheMutualFriendKey = cacheKeys.mutualFriendsList(userId);
    try {
      const cachedMutualFriendsData =
        await this.cacheManager.get(cacheMutualFriendKey);
      if (cachedMutualFriendsData) return cachedMutualFriendsData;

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
          username: true,
          profile_picture: true,
        },
      });

      const result = { mutualFollowers, totalCount };

      this.cacheManager.set(cacheMutualFriendKey, result);
      return result;
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
                { username: { contains: trimmedQuery, mode: 'insensitive' } },
              ],
            },
            { id: { notIn: [...blockedIds, userId] } }, // Exclude blocked users
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
          username: true,
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
                { username: { contains: trimmedQuery, mode: 'insensitive' } },
              ],
            },
            { id: { notIn: [...blockedIds, userId] } },
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
                  username: { contains: trimmedQuery, mode: 'insensitive' },
                },
              ],
            },
            {
              id: {
                notIn: [
                  ...blockedIds,
                  userId,
                  ...followersAndFollowing.map((u) => u.id),
                ],
              },
            },
            { is_active: true },
          ],
        },
        select: {
          id: true,
          username: true,
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
                  username: { contains: trimmedQuery, mode: 'insensitive' },
                },
              ],
            },
            {
              id: {
                notIn: [
                  ...blockedIds,
                  userId,
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

  // Enable 2FA :
  // Generate 2FA secret and QR code
  async generateTwoFactorAuthenticationSecret(user: any) {
    try {
      const secret = authenticator.generateSecret();
      const appName = 'Social Media';
      const otpAuthUrl = authenticator.keyuri(user.email, appName, secret);

      // Store secret in database
      await this.prisma.users.update({
        where: { id: user.id },
        data: {
          secret_2fa: secret,
          is_2fa: false,
        },
      });

      return { secret, otpAuthUrl };
    } catch (error) {
      throw new InternalServerErrorException(
        'Fail to generate 2FA secret code',
        error.message,
      );
    }
  }

  // Generate QR code for authenticator app
  async generateQrCodeDataURL(otpAuthUrl: string) {
    try {
      return await QRCode.toDataURL(otpAuthUrl);
    } catch (error) {
      throw new InternalServerErrorException(
        'Failed to generate QR code',
        error.message,
      );
    }
  }

  // Verify 2FA code
  async verifyTwoFactorAuthenticationCode(code: string, user: any) {
    try {
      if (!user.secret_2fa) {
        throw new BadRequestException('No 2FA secret found for this user');
      }

      const isValid = authenticator.verify({
        token: code,
        secret: user.secret_2fa,
      });

      if (!isValid) {
        throw new UnauthorizedException('Invalid 2FA code');
      }

      return true;
    } catch (error) {
      throw new InternalServerErrorException(
        'Fail to get 2fa secret',
        error.message,
      );
    }
  }

  // Enable 2FA
  async enableTwoFactorAuth(user: any) {
    try {
      if (!user.secret_2fa) {
        throw new BadRequestException('Cannot enable 2FA without a secret');
      }

      await this.prisma.users.update({
        where: { id: user.id },
        data: { is_2fa: true },
      });
    } catch (error) {
      throw new InternalServerErrorException(
        'Fail to enable 2FA',
        error.message,
      );
    }
  }

  // Login with 2FA
  async loginWith2FA(user: any) {
    try {
      return {
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          profile_picture: user.profile_picture,
        },
      };
    } catch (error) {
      throw new InternalServerErrorException(
        'Fail to login with 2FA',
        error.message,
      );
    }
  }
}
