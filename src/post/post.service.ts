import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreatePostDTO } from './dto/create-post.dto';

@Injectable()
export class PostService {
  constructor(private prisma: PrismaService) {}

  // Get Posts
  async getPosts() {
    return this.prisma.posts.findMany({
      orderBy: {
        created_at: 'desc',
      },
    });
  }

  // TODO Get Post By Id

  // Create Post
  async createPost(userId: number, createPostDto: CreatePostDTO) {
    const { title, content, status, media_url } = createPostDto;

    try {
      const newPost = await this.prisma.posts.create({
        data: {
          title,
          content,
          status,
          media_url: media_url ?? [],
          userId: userId,
        },
      });

      return newPost;
    } catch (error) {
      throw new InternalServerErrorException(error);
    }
  }

  // TODO Edit Post

  // TODO Delete Post
}
