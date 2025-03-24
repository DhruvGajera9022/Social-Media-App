import {
  Body,
  Controller,
  Get,
  HttpCode,
  Param,
  Patch,
  Post,
  Req,
  UseGuards,
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

@ApiTags('Posts') // Groups this under "Posts" in Swagger
@Controller('post')
export class PostController {
  constructor(private readonly postService: PostService) {}

  // All Posts
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
  @UseGuards(JwtAuthGuard)
  async createPost(@Req() req, @Body() createPostDto: CreatePostDTO) {
    try {
      const userId = +req.user.userId;
      const newPost = await this.postService.createPost(userId, createPostDto);
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
  @Get(':id')
  async getPostById(@Param('id') id: string) {
    try {
      const post = await this.postService.getPostById(+id);
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
}
