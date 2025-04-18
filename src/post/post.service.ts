import {
  BadRequestException,
  ForbiddenException,
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

@Injectable()
export class PostService {
  constructor(private readonly prisma: PrismaService) {
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
    try {
      return await this.prisma.posts.findMany({
        take: 10,
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
            take: 3, // Limit initial comments load
            orderBy: { created_at: 'desc' },
          },
          _count: {
            select: {
              Comments: true,
            },
          },
        },
      });
    } catch (error) {
      throw new InternalServerErrorException('Failed to fetch posts');
    }
  }

  async getPostById(postId: number, userId: number) {
    try {
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

      return {
        ...post,
        userLiked: !!userLiked,
      };
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
    const { title, content, status = PostEnum.PUBLISHED } = createPostDto;

    if (!files || files.length === 0) {
      throw new BadRequestException('No media files uploaded');
    }

    try {
      const mediaUrls = await this.uploadFilesToCloudinary(files);

      return await this.prisma.posts.create({
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
    try {
      // First check if post exists
      const post = await this.prisma.posts.findUnique({
        where: { id: postId },
      });

      if (!post) {
        throw new NotFoundException('Post not found');
      }

      // Check if user has already liked the post
      const existingLike = await this.prisma.postLikes.findUnique({
        where: { postId_userId: { postId, userId } },
      });

      if (existingLike) {
        // Unlike the post if already liked
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
        const [updatedPost] = await this.prisma.$transaction([
          this.prisma.posts.update({
            where: { id: postId },
            data: { likes_count: { increment: 1 } },
          }),
          this.prisma.postLikes.create({
            data: { postId, userId },
          }),
        ]);
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
    try {
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
    try {
      // Verify post exists
      const post = await this.prisma.posts.findUnique({
        where: { id: postId },
      });

      if (!post) {
        throw new NotFoundException('Post not found');
      }

      // Get comments with user info
      return await this.prisma.comments.findMany({
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
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new InternalServerErrorException('Failed to fetch comments');
    }
  }

  async toggleBookmark(postId: number, userId: number) {
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
    try {
      // Verify user exists
      const user = await this.prisma.users.findUnique({
        where: { id: userId },
      });

      if (!user) {
        throw new NotFoundException('User not found');
      }

      return this.prisma.bookmarks.findMany({
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
    } catch (error) {
      throw new InternalServerErrorException(error.message);
    }
  }
}
