import { CACHE_MANAGER } from '@nestjs/cache-manager';
import {
  Inject,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { Cache } from 'cache-manager';
import { AddCommentDTO } from 'src/comments/dto/add-comment.dto';
import { PrismaService } from 'src/prisma/prisma.service';
import { cacheKeys } from 'src/utils/cacheKeys.util';
import { EditCommentDTO } from './dto/edit-comment.dto';
import { NotificationsService } from 'src/notifications/notifications.service';

@Injectable()
export class CommentsService {
  constructor(
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
    private readonly prisma: PrismaService,
    private readonly notificationsService: NotificationsService,
  ) {}

  private async incrementViewCount(postId: number): Promise<void> {
    await this.prisma.posts.update({
      where: { id: postId },
      data: { views_count: { increment: 1 } },
    });
  }

  async commentPost(
    postId: number,
    userId: number,
    commentPostDto: AddCommentDTO,
  ) {
    const cachePostsKey = cacheKeys.postComments(postId);
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

      if (post.userId !== userId) {
        await this.notificationsService.createCommentNotification(
          postId,
          userId,
          post.userId,
        );
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

  async editComment(commentId: number, editCommentDto: EditCommentDTO) {
    const { content } = editCommentDto;
    try {
      const comment = await this.prisma.comments.findUnique({
        where: { id: commentId },
      });
      if (!comment) {
        throw new NotFoundException('Comment not found');
      }

      const cacheCommentsKey = cacheKeys.postComments(comment.postId);
      await this.cacheManager.del(cacheCommentsKey);

      return this.prisma.comments.update({
        where: { id: commentId },
        data: {
          content,
        },
      });
    } catch (error) {
      throw new InternalServerErrorException(error);
    }
  }

  async deleteComment(commentId: number) {
    try {
      const comment = await this.prisma.comments.findUnique({
        where: { id: commentId },
      });
      if (!comment) {
        throw new NotFoundException('Comment not found');
      }

      const cacheCommentsKey = cacheKeys.postComments(comment.postId);
      await this.cacheManager.del(cacheCommentsKey);

      return this.prisma.comments.delete({ where: { id: commentId } });
    } catch (error) {
      throw new InternalServerErrorException(error);
    }
  }
}
