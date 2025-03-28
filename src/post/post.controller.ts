import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Patch,
  Post,
  Req,
  UploadedFile,
  UploadedFiles,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { PostService } from './post.service';
import { Response } from 'src/utils/response.util';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { JwtAuthGuard } from 'src/authentication/guard/jwt-auth.guard';
import { CreatePostDTO } from './dto/create-post.dto';
import { EditPostDTO } from './dto/edit-post.dto';
import { FileInterceptor, FilesInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname } from 'path';

@ApiTags('Posts') // Groups this under "Posts" in Swagger documentaion
@Controller('post')
export class PostController {
  constructor(private readonly postService: PostService) {}

  // Get All Posts
  @ApiOperation({ summary: 'Get all posts' })
  @ApiResponse({ status: 200, description: 'List of posts' })
  @Get()
  async getPosts() {
    try {
      const posts = await this.postService.getPosts();
      return Response(true, 'Posts retrieved successfully.', posts);
    } catch (error) {
      return Response(false, 'Failed to retrieve posts.', error.message);
    }
  }

  // Create Post
  @ApiOperation({ summary: 'Create post' })
  @ApiResponse({ status: 201, description: 'Post created successfully' })
  @ApiResponse({ status: 400, description: 'Validation error' })
  @Post()
  @UseGuards(JwtAuthGuard)
  @HttpCode(201)
  @UseInterceptors(
    FilesInterceptor('media_url', 10, {
      // '10' is the max file count, adjust as needed
      storage: diskStorage({
        destination: './uploads/media_content',
        filename: (req, file, callback) => {
          const uniqueSuffix =
            Date.now() + '-' + Math.round(Math.random() * 1e9);
          const ext = extname(file.originalname);
          const fileName = `${uniqueSuffix}${ext}`;
          callback(null, fileName);
        },
      }),
    }),
  )
  async createPost(
    @Req() req,
    @Body() createPostDto: CreatePostDTO,
    @UploadedFiles() files: Express.Multer.File[],
  ) {
    try {
      if (!files || files.length === 0) {
        return { status: false, message: 'No files uploaded' };
      }

      const userId = +req.user.userId;
      const newPost = await this.postService.createPost(
        userId,
        createPostDto,
        files, // Pass multiple files to service
      );
      return Response(true, 'Post created successfully', newPost);
    } catch (error) {
      return Response(false, 'Failed to create post', error.message);
    }
  }

  // Get Post By Id
  @ApiOperation({ summary: 'Get a post by ID' })
  @ApiParam({ name: 'id', required: true, description: 'Post ID' })
  @ApiResponse({ status: 200, description: 'Post retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Post not found' })
  @UseGuards(JwtAuthGuard)
  @Get(':id')
  async getPostById(@Param('id') id: string, @Req() req) {
    try {
      const userId = +req.user.userId;
      const post = await this.postService.getPostById(+id, userId);
      return Response(true, 'Post retrieved successfully', post);
    } catch (error) {
      return Response(false, 'Failed to fetch post', error.message);
    }
  }

  // Edit post
  @ApiOperation({ summary: 'Edit a post' })
  @ApiResponse({ status: 200, description: 'Post edited successfully' })
  @ApiResponse({ status: 404, description: 'Post not found' })
  @ApiResponse({ status: 500, description: 'Failed to edit post' })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Patch(':id')
  async editPost(
    @Param('id') id: string,
    @Req() req,
    @Body() editPostDto: EditPostDTO,
  ) {
    try {
      const userId = +req.user.userId;
      const editPost = await this.postService.editPost(
        +id,
        userId,
        editPostDto,
      );

      return Response(true, 'Post edited successfully', editPost);
    } catch (error) {
      return Response(false, 'Failed to edit post', error.message);
    }
  }

  // Pin post
  @ApiOperation({ summary: 'Pin post by ID' })
  @ApiParam({ name: 'id', description: 'Post ID', example: 1 })
  @UseGuards(JwtAuthGuard)
  @Patch(':id/pin')
  async pinPost(@Param('id') id: string, @Req() req) {
    try {
      const userId = +req.user.userId;
      const pinnedPost = await this.postService.pinningPost(+id, userId);
      const pinnedMessage = pinnedPost.pinned
        ? 'Post pinned successfully'
        : 'Post unpinned successfully';

      return Response(true, pinnedMessage, pinnedPost);
    } catch (error) {
      return Response(false, 'Failed to pin the post', error.message);
    }
  }

  // Delete post
  @ApiOperation({ summary: 'Delete post by ID' })
  @ApiParam({ name: 'id', description: 'Post ID', example: 1 })
  @ApiResponse({ status: 200, description: 'Post deleted successfully' })
  @ApiResponse({ status: 400, description: 'Invalid ID' })
  @ApiResponse({ status: 404, description: 'Post not found' })
  @UseGuards(JwtAuthGuard)
  @Delete(':id')
  async deletePost(@Param('id') id: string, @Req() req) {
    try {
      const userId = +req.user.userId;
      const deletePost = await this.postService.deletePost(+id, userId);

      return Response(true, 'Post deleted successfully', deletePost);
    } catch (error) {
      return Response(false, 'Failed to delete the post', error.message);
    }
  }
}
