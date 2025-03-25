import {
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
      orderBy: {
        created_at: 'desc',
      },
    });
  }

  // Get Post By Id
  async getPostById(postId: number) {
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

  // Create Post
  async createPost(
    userId: number,
    createPostDto: CreatePostDTO,
    files: Express.Multer.File[],
  ) {
    const { title, content, status } = createPostDto;

    try {
      // Ensure files exist
      if (!files || files.length === 0) {
        throw new Error('No files uploaded');
      }

      // Upload each file to Cloudinary
      const uploadResults = await Promise.all(
        files.map(async (file) => {
          const result = await uploadToCloudinary(file.path);
          await fs.promises.unlink(file.path); // Remove file after upload
          return result.secure_url;
        }),
      );

      // Store URLs in database
      const newPost = await this.prisma.posts.create({
        data: {
          title,
          content,
          status,
          media_url: uploadResults,
          userId: userId,
        },
      });

      return newPost;
    } catch (error) {
      // Clean up any remaining files if an error occurs
      if (files) {
        await Promise.all(
          files.map(async (file) => {
            if (file.path && fs.existsSync(file.path)) {
              await fs.promises.unlink(file.path);
            }
          }),
        );
      }
      throw new InternalServerErrorException(error);
    }
  }

  // Edit Post
  async editPost(postId: number, userId: number, editPostDto: EditPostDTO) {
    const { title, content, status, media_url } = editPostDto;

    try {
      const post = await this.prisma.posts.findFirst({
        where: { id: postId, userId },
      });
      if (!post) {
        throw new NotFoundException('Post not found');
      }

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
      const post = await this.prisma.posts.findFirst({
        where: { id: postId, userId },
      });
      if (!post) {
        throw new NotFoundException('Post not found');
      }

      return this.prisma.posts.delete({ where: { id: postId } });
    } catch (error) {
      throw new InternalServerErrorException(error);
    }
  }
}
