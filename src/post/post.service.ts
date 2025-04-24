import {
  BadRequestException,
  ForbiddenException,
  Inject,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreatePostDTO } from './dto/create-post.dto';
import { EditPostDTO } from './dto/edit-post.dto';
import { v2 as cloudinary } from 'cloudinary';
import * as fs from 'fs';
import { uploadToCloudinary } from 'src/utils/cloudinary.util';
import { PostEnum } from './enum/post-status.enum';
import { CommentPostDTO } from './dto/comment-post.dto';
import { Cache } from 'cache-manager';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { cacheKeys } from 'src/utils/cacheKeys.util';
import { NotificationsService } from 'src/notifications/notifications.service';
import { NotificationType } from '@prisma/client';

@Injectable()
export class PostService {
  constructor(
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
    private readonly prisma: PrismaService,
    private readonly notificationsService: NotificationsService,
  ) {
    this.configureCloudinary();
  }

  private configureCloudinary(): void {
    cloudinary.config({
      cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
      api_key: process.env.CLOUDINARY_API_KEY,
      api_secret: process.env.CLOUDINARY_API_SECRET,
    });
  }

  async getPosts() {
    const cachePostsKey = cacheKeys.posts();
    try {
      const cachedPostsData = await this.cacheManager.get(cachePostsKey);
      if (cachedPostsData) {
        return cachedPostsData;
      }

      const posts = await this.prisma.posts.findMany({
        orderBy: { created_at: 'desc' },
        select: {
          id: true,
          title: true,
          content: true,
          media_url: true,
          created_at: true,
          pinned: true,
          likes_count: true,
          views_count: true,
          status: true,
          user: {
            select: {
              id: true,
              username: true,
              profile_picture: true,
            },
          },
          Comments: {
            select: {
              id: true,
              userId: true,
              content: true,
              created_at: true,
              user: {
                select: {
                  username: true,
                  profile_picture: true,
                },
              },
            },
            orderBy: { created_at: 'desc' },
          },
          _count: {
            select: {
              Comments: true,
            },
          },
        },
      });

      await this.cacheManager.set(cachePostsKey, posts);

      return posts;
    } catch (error) {
      throw new InternalServerErrorException('Failed to fetch posts');
    }
  }

  async getPostById(postId: number, userId: number) {
    const cachePostIdKey = cacheKeys.postId(postId);
    try {
      const cachedPostIdData = await this.cacheManager.get(cachePostIdKey);
      if (cachedPostIdData) {
        return cachedPostIdData;
      }

      const post = await this.prisma.posts.findUnique({
        where: { id: postId },
        include: {
          user: {
            select: {
              id: true,
              username: true,
              profile_picture: true,
            },
          },
          Comments: {
            select: {
              id: true,
              content: true,
              created_at: true,
              userId: true,
              user: {
                select: {
                  username: true,
                  profile_picture: true,
                },
              },
            },
            orderBy: { created_at: 'desc' },
            take: 10,
          },
          _count: {
            select: {
              Comments: true,
            },
          },
        },
      });

      if (!post) {
        throw new NotFoundException('Post not found');
      }

      // Check if user can view draft posts
      if (post.status === PostEnum.DRAFT && post.userId !== userId) {
        throw new ForbiddenException('You cannot view this draft post');
      }

      // Check if viewer is not the author to increment view count
      if (post.userId !== userId && post.status === PostEnum.PUBLISHED) {
        await this.incrementViewCount(postId);
      }

      // Check if user has liked the post
      const userLiked = await this.prisma.postLikes.findUnique({
        where: { postId_userId: { postId, userId } },
      });

      const result = {
        ...post,
        userLiked: !!userLiked,
      };

      this.cacheManager.set(cachePostIdKey, result);

      return result;
    } catch (error) {
      if (
        error instanceof NotFoundException ||
        error instanceof ForbiddenException
      ) {
        throw error;
      }
      throw new InternalServerErrorException('Failed to fetch post');
    }
  }

  private async incrementViewCount(postId: number): Promise<void> {
    await this.prisma.posts.update({
      where: { id: postId },
      data: { views_count: { increment: 1 } },
    });
  }

  async createPost(
    userId: number,
    createPostDto: CreatePostDTO,
    files: Express.Multer.File[],
  ) {
    const cachePostsKey = cacheKeys.posts();
    const { title, content, status = PostEnum.PUBLISHED } = createPostDto;

    if (!files || files.length === 0) {
      throw new BadRequestException('No media files uploaded');
    }

    try {
      const mediaUrls = await this.uploadFilesToCloudinary(files);

      const newPost = await this.prisma.posts.create({
        data: {
          title,
          content,
          status,
          media_url: mediaUrls,
          userId,
        },
        include: {
          user: {
            select: {
              username: true,
              profile_picture: true,
            },
          },
        },
      });

      await this.cacheManager.del(cachePostsKey);

      return newPost;
    } catch (error) {
      await this.cleanupFiles(files);
      throw new InternalServerErrorException(
        'Failed to create post: ' + error.message,
      );
    }
  }

  private async uploadFilesToCloudinary(
    files: Express.Multer.File[],
  ): Promise<string[]> {
    try {
      const mediaUrls = await Promise.all(
        files.map(async (file) => {
          const isVideo = file.mimetype.startsWith('video/');
          const uploadResult = await uploadToCloudinary(
            file.path,
            isVideo ? 'video' : 'image',
          );
          await fs.promises.unlink(file.path);
          return uploadResult.secure_url;
        }),
      );
      return mediaUrls;
    } catch (error) {
      throw new InternalServerErrorException('Failed to upload media files');
    }
  }

  private async cleanupFiles(files: Express.Multer.File[]): Promise<void> {
    await Promise.all(
      files.map(async (file) => {
        if (file.path && fs.existsSync(file.path)) {
          await fs.promises.unlink(file.path);
        }
      }),
    );
  }

  async editPost(postId: number, userId: number, editPostDto: EditPostDTO) {
    const cachePostsKey = cacheKeys.posts();
    try {
      const post = await this.prisma.posts.findUnique({
        where: { id: postId },
      });

      if (!post) {
        throw new NotFoundException('Post not found');
      }

      if (post.userId !== userId) {
        throw new ForbiddenException('You can only edit your own posts');
      }

      const { title, content, status, media_url } = editPostDto;

      await this.cacheManager.del(cachePostsKey);

      return await this.prisma.posts.update({
        where: { id: postId },
        data: {
          ...(title && { title }),
          ...(content && { content }),
          ...(status && { status }),
          ...(media_url && { media_url }),
        },
        include: {
          user: {
            select: {
              username: true,
              profile_picture: true,
            },
          },
        },
      });
    } catch (error) {
      if (
        error instanceof NotFoundException ||
        error instanceof ForbiddenException
      ) {
        throw error;
      }
      throw new InternalServerErrorException('Failed to update post');
    }
  }

  async deletePost(postId: number, userId: number) {
    const cachePostsKey = cacheKeys.posts();
    try {
      const post = await this.prisma.posts.findUnique({
        where: { id: postId },
      });

      if (!post) {
        throw new NotFoundException('Post not found');
      }

      if (post.userId !== userId) {
        throw new ForbiddenException('You can only delete your own posts');
      }

      await this.cacheManager.del(cachePostsKey);

      // Delete all comments, likes, and the post itself in a transaction
      return await this.prisma.$transaction(async (prisma) => {
        await prisma.comments.deleteMany({ where: { postId } });
        await prisma.postLikes.deleteMany({ where: { postId } });
        return prisma.posts.delete({ where: { id: postId } });
      });
    } catch (error) {
      if (
        error instanceof NotFoundException ||
        error instanceof ForbiddenException
      ) {
        throw error;
      }
      throw new InternalServerErrorException('Failed to delete post');
    }
  }

  async pinningPost(postId: number, userId: number) {
    const cachePostsKey = cacheKeys.posts();
    try {
      const post = await this.prisma.posts.findUnique({
        where: { id: postId },
      });

      if (!post) {
        throw new NotFoundException('Post not found');
      }

      if (post.userId !== userId) {
        throw new ForbiddenException('You can only pin your own posts');
      }

      await this.cacheManager.del(cachePostsKey);

      return await this.prisma.posts.update({
        where: { id: postId },
        data: { pinned: !post.pinned },
      });
    } catch (error) {
      if (
        error instanceof NotFoundException ||
        error instanceof ForbiddenException
      ) {
        throw error;
      }
      throw new InternalServerErrorException('Failed to pin/unpin post');
    }
  }

  async likePost(postId: number, userId: number) {
    const cachePostsKey = cacheKeys.posts();
    try {
      console.log(`User ${userId} attempting to like/unlike post ${postId}`);
      // First check if post exists
      const post = await this.prisma.posts.findUnique({
        where: { id: postId },
      });

      if (!post) {
        throw new NotFoundException('Post not found');
      }

      console.log(`Post belongs to user ${post.userId}`);

      // Check if user has already liked the post
      const existingLike = await this.prisma.postLikes.findUnique({
        where: { postId_userId: { postId, userId } },
      });

      await this.cacheManager.del(cachePostsKey);

      if (existingLike) {
        // Unlike the post if already liked
        console.log(`User ${userId} is unliking post ${postId}`);
        const [updatedPost] = await this.prisma.$transaction([
          this.prisma.posts.update({
            where: { id: postId },
            data: { likes_count: { decrement: 1 } },
          }),
          this.prisma.postLikes.delete({
            where: { postId_userId: { postId, userId } },
          }),
        ]);
        return { message: 'Post unliked', post: updatedPost };
      } else {
        // Like the post if not already liked
        console.log(`User ${userId} is liking post ${postId}`);
        const [updatedPost] = await this.prisma.$transaction([
          this.prisma.posts.update({
            where: { id: postId },
            data: { likes_count: { increment: 1 } },
          }),
          this.prisma.postLikes.create({
            data: { postId, userId },
          }),
        ]);

        if (post.userId !== userId) {
          console.log(
            `Creating notification: User ${userId} liked post ${postId} of user ${post.userId}`,
          );
          await this.notificationsService.createLikeNotification(
            postId,
            userId,
            post.userId,
          );
        } else {
          console.log(`No notification created: User liked their own post`);
        }

        return { message: 'Post liked', post: updatedPost };
      }
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new InternalServerErrorException('Failed to like/unlike post');
    }
  }

  async commentPost(
    postId: number,
    userId: number,
    commentPostDto: CommentPostDTO,
  ) {
    const cachePostsKey = cacheKeys.posts();
    try {
      await this.incrementViewCount(postId);
      // Verify post exists
      const post = await this.prisma.posts.findUnique({
        where: { id: postId },
      });

      if (!post) {
        throw new NotFoundException('Post not found');
      }

      // Verify user exists
      const user = await this.prisma.users.findUnique({
        where: { id: userId },
      });

      if (!user) {
        throw new NotFoundException('User not found');
      }

      await this.cacheManager.del(cachePostsKey);

      // Create comment
      return await this.prisma.comments.create({
        data: {
          postId,
          userId,
          content: commentPostDto.content,
        },
        include: {
          user: {
            select: {
              username: true,
              profile_picture: true,
            },
          },
        },
      });
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new InternalServerErrorException('Failed to create comment');
    }
  }

  async getComments(postId: number) {
    const cacheCommentsKey = cacheKeys.postComments(postId);
    try {
      const cachedCommentData = await this.cacheManager.get(cacheCommentsKey);
      if (cachedCommentData) {
        return cachedCommentData;
      }

      // Verify post exists
      const post = await this.prisma.posts.findUnique({
        where: { id: postId },
      });

      if (!post) {
        throw new NotFoundException('Post not found');
      }

      // Get comments with user info
      const comments = await this.prisma.comments.findMany({
        where: { postId },
        orderBy: { created_at: 'desc' },
        include: {
          user: {
            select: {
              username: true,
              profile_picture: true,
            },
          },
        },
      });

      await this.cacheManager.set(cacheCommentsKey, comments);

      return comments;
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new InternalServerErrorException('Failed to fetch comments');
    }
  }

  async toggleBookmark(postId: number, userId: number) {
    const cacheBookMarkKey = cacheKeys.postBookmarks(userId);
    try {
      // Verify post exists
      const post = await this.prisma.posts.findUnique({
        where: { id: postId },
      });

      if (!post) {
        throw new NotFoundException('Post not found');
      }

      // Check if bookmark already exists
      const existingBookmark = await this.prisma.bookmarks.findFirst({
        where: {
          postId,
          userId,
        },
      });

      await this.cacheManager.del(cacheBookMarkKey);

      if (existingBookmark) {
        // Remove bookmark
        await this.prisma.bookmarks.delete({
          where: { id: existingBookmark.id },
        });
        return {
          message: 'Post removed from bookmarks',
          bookmarked: false,
        };
      } else {
        // Add bookmark
        await this.prisma.bookmarks.create({
          data: {
            postId,
            userId,
          },
        });
        return {
          message: 'Post added to bookmarks',
          bookmarked: true,
        };
      }
    } catch (error) {
      throw new InternalServerErrorException(error.message);
    }
  }

  async getBookmarks(userId: number) {
    const cacheBookMarkKey = cacheKeys.postBookmarks(userId);
    try {
      const cachedBookmarkedData =
        await this.cacheManager.get(cacheBookMarkKey);
      if (cachedBookmarkedData) {
        return cachedBookmarkedData;
      }

      // Verify user exists
      const user = await this.prisma.users.findUnique({
        where: { id: userId },
      });

      if (!user) {
        throw new NotFoundException('User not found');
      }

      const bookmarks = await this.prisma.bookmarks.findMany({
        where: { userId },
        select: {
          id: true,
          created_at: true,
          post: {
            select: {
              id: true,
              title: true,
              content: true,
              media_url: true,
              likes_count: true,
              views_count: true,
              created_at: true,
              user: {
                select: {
                  id: true,
                  username: true,
                  profile_picture: true,
                },
              },
              _count: {
                select: {
                  Comments: true,
                },
              },
            },
          },
        },
      });

      await this.cacheManager.set(cacheBookMarkKey, bookmarks);

      return bookmarks;
    } catch (error) {
      throw new InternalServerErrorException(error.message);
    }
  }
}
