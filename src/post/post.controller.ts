import { Controller, Get } from '@nestjs/common';
import { PostService } from './post.service';
import { Response } from 'src/utils/response.util';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';

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
}
