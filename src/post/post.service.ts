import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class PostService {
  constructor(private prisma: PrismaService) {}

  // TODO Get Posts
  async getPosts() {
    return this.prisma.posts.findMany({
      orderBy: {
        created_at: 'desc',
      },
    });
  }
  // TODO Get Post By Id
  // TODO Create Post
  // TODO Edit Post
  // TODO Delete Post
}
