import { Body, Controller, Get, Post, Req, UseGuards } from '@nestjs/common';
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
    const posts = await this.postService.getPosts();

    return Response(true, 'Posts retrieved successfully.', posts);
  }

  // Create Post
  @Post()
  @UseGuards(JwtAuthGuard)
  async createPost(@Req() req, @Body() createPostDto: CreatePostDTO) {
    const newPost = await this.postService.createPost(
      +req.user.userId,
      createPostDto,
    );

    return Response(true, 'Post created successfully', newPost);
  }
}
