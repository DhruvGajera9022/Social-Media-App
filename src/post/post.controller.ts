import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Req,
  Res,
  UploadedFiles,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { PostService } from './post.service';
import {
  ApiBearerAuth,
  ApiConsumes,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { JwtAuthGuard } from 'src/authentication/guard/jwt-auth.guard';
import { CreatePostDTO } from './dto/create-post.dto';
import { EditPostDTO } from './dto/edit-post.dto';
import { FilesInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname } from 'path';
import { CommentPostDTO } from './dto/comment-post.dto';
import { Request, Response as ExpressResponse } from 'express';
import { errorResponse, successResponse } from 'src/utils/response.util';

@ApiTags('Posts')
@Controller('post')
export class PostController {
  constructor(private readonly postService: PostService) {}

  @Get()
  @ApiOperation({ summary: 'Get all posts' })
  @ApiResponse({
    status: 200,
    description: 'List of posts retrieved successfully',
  })
  @ApiResponse({ status: 500, description: 'Server error' })
  async getPosts(@Res() res: ExpressResponse) {
    try {
      const posts = await this.postService.getPosts();
      return successResponse(res, 'Posts retrieved successfully', posts);
    } catch (error) {
      return errorResponse(res, 500, error.message);
    }
  }

  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Get all bookmarked posts for authenticated user' })
  @ApiResponse({ status: 200, description: 'Bookmarks fetched successfully' })
  @ApiResponse({ status: 404, description: 'User not found' })
  @ApiResponse({ status: 500, description: 'Server error' })
  @ApiBearerAuth()
  @Get('bookmarks')
  async getBookmarks(
    @Req() req: Request & { user: { userId: number } },
    @Res() res: ExpressResponse,
  ) {
    try {
      const userId = req.user.userId;
      const bookmarks = await this.postService.getBookmarks(userId);
      return successResponse(
        res,
        'Bookmarked posts fetched successfully',
        bookmarks,
      );
    } catch (error) {
      return errorResponse(res, error.status || 500, error.message);
    }
  }

  @ApiOperation({ summary: 'Get all comments for a post' })
  @ApiParam({ name: 'id', required: true, description: 'Post ID' })
  @ApiResponse({ status: 200, description: 'Comments retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Post not found' })
  @ApiResponse({ status: 500, description: 'Server error' })
  @Get(':id/comment')
  async getComments(
    @Param('id', ParseIntPipe) id: number,
    @Res() res: ExpressResponse,
  ) {
    try {
      const comments = await this.postService.getComments(id);
      return successResponse(res, 'Comments retrieved successfully', comments);
    } catch (error) {
      return errorResponse(res, error.status || 500, error.message);
    }
  }

  @ApiOperation({ summary: 'Get a post by ID' })
  @ApiParam({ name: 'id', required: true, description: 'Post ID' })
  @ApiResponse({ status: 200, description: 'Post retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Post not found' })
  @ApiResponse({ status: 500, description: 'Server error' })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Get(':id')
  async getPostById(
    @Param('id', ParseIntPipe) id: number,
    @Req() req: Request & { user: { userId: number } },
    @Res() res: ExpressResponse,
  ) {
    try {
      const userId = req.user.userId;
      const post = await this.postService.getPostById(id, userId);
      return successResponse(res, 'Post retrieved successfully', post);
    } catch (error) {
      return errorResponse(res, error.status || 500, error.message);
    }
  }

  @ApiOperation({ summary: 'Create new post' })
  @ApiConsumes('multipart/form-data')
  @ApiResponse({ status: 201, description: 'Post created successfully' })
  @ApiResponse({
    status: 400,
    description: 'Validation error or no files uploaded',
  })
  @ApiResponse({ status: 500, description: 'Server error' })
  @ApiBearerAuth()
  @Post()
  @UseGuards(JwtAuthGuard)
  @HttpCode(201)
  @UseInterceptors(
    FilesInterceptor('media_url', 10, {
      storage: diskStorage({
        destination: './uploads/media_content',
        filename: (_, file, callback) => {
          const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
          const ext = extname(file.originalname);
          callback(null, `${uniqueSuffix}${ext}`);
        },
      }),
    }),
  )
  async createPost(
    @Req() req: Request & { user: { userId: number } },
    @Body() createPostDto: CreatePostDTO,
    @UploadedFiles() files: Express.Multer.File[],
    @Res() res: ExpressResponse,
  ) {
    try {
      if (!files || files.length === 0) {
        return errorResponse(res, 400, 'No files uploaded');
      }

      const userId = req.user.userId;
      const newPost = await this.postService.createPost(
        userId,
        createPostDto,
        files,
      );
      return successResponse(res, 'Post created successfully', newPost);
    } catch (error) {
      return errorResponse(res, error.status || 500, error.message);
    }
  }

  @ApiOperation({ summary: 'Edit a post' })
  @ApiParam({ name: 'id', required: true, description: 'Post ID' })
  @ApiResponse({ status: 200, description: 'Post edited successfully' })
  @ApiResponse({ status: 403, description: 'Forbidden - not post owner' })
  @ApiResponse({ status: 404, description: 'Post not found' })
  @ApiResponse({ status: 500, description: 'Server error' })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Patch(':id')
  async editPost(
    @Param('id', ParseIntPipe) id: number,
    @Req() req: Request & { user: { userId: number } },
    @Body() editPostDto: EditPostDTO,
    @Res() res: ExpressResponse,
  ) {
    try {
      const userId = req.user.userId;
      const editedPost = await this.postService.editPost(
        id,
        userId,
        editPostDto,
      );
      return successResponse(res, 'Post edited successfully', editedPost);
    } catch (error) {
      return errorResponse(res, error.status || 500, error.message);
    }
  }

  @ApiOperation({ summary: 'Pin or unpin post' })
  @ApiParam({ name: 'id', required: true, description: 'Post ID' })
  @ApiResponse({
    status: 200,
    description: 'Post pinned/unpinned successfully',
  })
  @ApiResponse({ status: 403, description: 'Forbidden - not post owner' })
  @ApiResponse({ status: 404, description: 'Post not found' })
  @ApiResponse({ status: 500, description: 'Server error' })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Patch(':id/pin')
  async pinPost(
    @Param('id', ParseIntPipe) id: number,
    @Req() req: Request & { user: { userId: number } },
    @Res() res: ExpressResponse,
  ) {
    try {
      const userId = req.user.userId;
      const pinnedPost = await this.postService.pinningPost(id, userId);
      const pinnedMessage = pinnedPost.pinned
        ? 'Post pinned successfully'
        : 'Post unpinned successfully';

      return successResponse(res, pinnedMessage, pinnedPost);
    } catch (error) {
      return errorResponse(res, error.status || 500, error.message);
    }
  }

  @ApiOperation({ summary: 'Like or unlike post' })
  @ApiParam({ name: 'id', required: true, description: 'Post ID' })
  @ApiResponse({ status: 200, description: 'Post liked/unliked successfully' })
  @ApiResponse({ status: 404, description: 'Post not found' })
  @ApiResponse({ status: 500, description: 'Server error' })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Patch(':id/like')
  async likePost(
    @Param('id', ParseIntPipe) id: number,
    @Req() req: Request & { user: { userId: number } },
    @Res() res: ExpressResponse,
  ) {
    try {
      const userId = req.user.userId;
      const { message, post } = await this.postService.likePost(id, userId);
      return successResponse(res, message, post);
    } catch (error) {
      return errorResponse(res, error.status || 500, error.message);
    }
  }

  @ApiOperation({ summary: 'Delete post' })
  @ApiParam({ name: 'id', required: true, description: 'Post ID' })
  @ApiResponse({ status: 200, description: 'Post deleted successfully' })
  @ApiResponse({ status: 403, description: 'Forbidden - not post owner' })
  @ApiResponse({ status: 404, description: 'Post not found' })
  @ApiResponse({ status: 500, description: 'Server error' })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Delete(':id')
  async deletePost(
    @Param('id', ParseIntPipe) id: number,
    @Req() req: Request & { user: { userId: number } },
    @Res() res: ExpressResponse,
  ) {
    try {
      const userId = req.user.userId;
      const deletedPost = await this.postService.deletePost(id, userId);
      return successResponse(res, 'Post deleted successfully', deletedPost);
    } catch (error) {
      return errorResponse(res, error.status || 500, error.message);
    }
  }

  @ApiOperation({ summary: 'Comment on a post' })
  @ApiParam({ name: 'id', required: true, description: 'Post ID' })
  @ApiResponse({ status: 201, description: 'Comment added successfully' })
  @ApiResponse({ status: 404, description: 'Post or user not found' })
  @ApiResponse({ status: 500, description: 'Server error' })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Post(':id/comment')
  @HttpCode(201)
  async commentPost(
    @Param('id', ParseIntPipe) id: number,
    @Req() req: Request & { user: { userId: number } },
    @Body() commentPostDto: CommentPostDTO,
    @Res() res: ExpressResponse,
  ) {
    try {
      const userId = req.user.userId;
      const newComment = await this.postService.commentPost(
        id,
        userId,
        commentPostDto,
      );
      return successResponse(res, 'Comment added successfully', newComment);
    } catch (error) {
      return errorResponse(res, error.status || 500, error.message);
    }
  }

  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Bookmark or unbookmark a post' })
  @ApiParam({ name: 'id', required: true, description: 'Post ID' })
  @ApiResponse({ status: 200, description: 'Bookmark toggled successfully' })
  @ApiResponse({ status: 404, description: 'Post not found' })
  @ApiBearerAuth()
  @Patch(':id/bookmark')
  async toggleBookmark(
    @Param('id', ParseIntPipe) id: number,
    @Req() req: Request & { user: { userId: number } },
    @Res() res: ExpressResponse,
  ) {
    try {
      const userId = req.user.userId;
      const result = await this.postService.toggleBookmark(id, userId);
      return successResponse(res, result.message, {
        bookmarked: result.bookmarked,
      });
    } catch (error) {
      return errorResponse(res, error.status || 500, error.message);
    }
  }
}
