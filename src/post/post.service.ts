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

@Injectable()
export class PostService {
  constructor(private prisma: PrismaService) {
    cloudinary.config({
      cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
      api_key: process.env.CLOUDINARY_API_KEY,
      api_secret: process.env.CLOUDINARY_API_SECRET,
    });
  }

  // Get Posts
  async getPosts() {
    return this.prisma.posts.findMany({
      take: 10,
      orderBy: {
        created_at: 'desc',
      },
      select: {
        id: true,
        title: true,
        content: true,
        media_url: true,
        created_at: true,
        user: {
          select: {
            username: true,
            profile_picture: true,
          },
        },
      },
    });
  }

  // Get Single Post
  async singlePost(postId: number) {
    try {
      const post = await this.prisma.posts.findUnique({
        where: { id: postId },
      });
      if (!post) {
        throw new NotFoundException('Post not found');
      }
      return post;
    } catch (error) {
      throw new InternalServerErrorException(error);
    }
  }

  // Get Post By Id
  async getPostById(postId: number, userId: number) {
    try {
      const post = await this.singlePost(postId);

      // Check if post.userId !== userId then update view_count
      if (post.userId !== userId && post.status !== PostEnum.DRAFT) {
        await this.prisma.posts.update({
          where: { id: postId },
          data: {
            views_count: {
              increment: 1,
            },
          },
        });
      }

      return post;
    } catch (error) {
      throw new InternalServerErrorException(error);
    }
  }

  // Create Post
  async createPost(
    userId: number,
    createPostDto: CreatePostDTO,
    files: Express.Multer.File[],
  ) {
    const { title, content, status } = createPostDto;

    if (!files || files.length === 0) {
      throw new BadRequestException('No media files uploaded');
    }

    try {
      const mediaUrls = await Promise.all(
        files.map(async (file) => {
          const isVideo = file.mimetype.startsWith('video/');
          const uploadResult = await this.uploadFileToCloudinary(
            file.path,
            isVideo,
          );
          await fs.promises.unlink(file.path);
          return uploadResult.secure_url;
        }),
      );

      const newPost = await this.prisma.posts.create({
        data: {
          title,
          content,
          status: PostEnum.PUBLISHED ?? status,
          media_url: mediaUrls,
          userId,
        },
      });

      return newPost;
    } catch (error) {
      await this.cleanupFiles(files);
      throw new InternalServerErrorException(error.message);
    }
  }

  async uploadFileToCloudinary(filePath: string, isVideo: boolean) {
    return uploadToCloudinary(filePath, isVideo ? 'video' : 'image');
  }

  async cleanupFiles(files: Express.Multer.File[]) {
    await Promise.all(
      files.map(async (file) => {
        if (file.path && fs.existsSync(file.path)) {
          await fs.promises.unlink(file.path);
        }
      }),
    );
  }

  // Edit Post
  async editPost(postId: number, userId: number, editPostDto: EditPostDTO) {
    const { title, content, status, media_url } = editPostDto;

    try {
      const post = await this.singlePost(postId);

      const updatePost = await this.prisma.posts.update({
        where: { id: post.id },
        data: {
          title: title ?? post.title,
          content: content ?? post.content,
          status: status ?? post.status,
          media_url: media_url ?? post.media_url,
        },
      });

      return updatePost;
    } catch (error) {
      throw new InternalServerErrorException(error);
    }
  }

  // Delete Post
  async deletePost(postId: number, userId: number) {
    try {
      await this.singlePost(postId);

      return this.prisma.posts.delete({ where: { id: postId } });
    } catch (error) {
      throw new InternalServerErrorException(error);
    }
  }

  // Pinning Post
  async pinningPost(postId: number, userId: number) {
    try {
      // Find the post
      const post = await this.singlePost(postId);

      if (userId !== post.userId) {
        throw new ForbiddenException('You are not allowed to pin this post');
      }

      const pinnedPost = await this.prisma.posts.update({
        where: { id: postId },
        data: {
          pinned: !post.pinned, // Toggle: true / false
        },
      });

      return pinnedPost;
    } catch (error) {
      throw new InternalServerErrorException(error);
    }
  }

  // Like Post
  async likePost(postId: number, userId: number) {
    try {
      // Check if user has already liked the post
      const existingLike = await this.prisma.postLikes.findUnique({
        where: {
          postId_userId: { postId, userId },
        },
      });
      if (existingLike) {
        // If like exists, remove it (decrement count)
        const [updatedPost] = await this.prisma.$transaction([
          this.prisma.posts.update({
            where: { id: postId },
            data: {
              likes_count: { decrement: 1 },
            },
          }),
          this.prisma.postLikes.delete({
            where: { postId_userId: { postId, userId } },
          }),
        ]);
        return { message: 'Like removed', post: updatedPost };
      } else {
        // Start a transaction to like the post
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
      throw new InternalServerErrorException(error);
    }
  }
}
