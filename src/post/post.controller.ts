import {
  Body,
  Controller,
  Get,
  HttpCode,
  Post,
  Request,
  UseGuards,
} from '@nestjs/common';
import { PostService } from './post.service';
import { Response } from 'src/utils/response.util';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from 'src/authentication/guard/jwt-auth.guard';
import { CreatePostDTO } from './dto/create-post.dto';

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
  async createPost(@Request() req, @Body() createPostDto: CreatePostDTO) {
    try {
      const userId = +req.user.userId;
      const newPost = await this.postService.createPost(userId, createPostDto);
      return Response(true, 'Post created successfully', newPost);
    } catch (error) {
      return Response(false, 'Failed to create post', error.message);
    }
  }
}
