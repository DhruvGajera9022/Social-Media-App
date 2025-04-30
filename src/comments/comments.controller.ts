import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Inject,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Put,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import { CommentsService } from './comments.service';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { JwtAuthGuard } from 'src/authentication/guard/jwt-auth.guard';
import { AddCommentDTO } from 'src/comments/dto/add-comment.dto';
import { Request, Response } from 'express';
import { errorResponse, successResponse } from 'src/utils/response.util';
import { EditCommentDTO } from './dto/edit-comment.dto';
import { Logger } from 'winston';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';

@ApiTags('Comments')
@Controller('comments')
export class CommentsController {
  constructor(
    private readonly commentsService: CommentsService,
    @Inject(WINSTON_MODULE_PROVIDER) private readonly logger: Logger,
  ) {}

  @Post(':id')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @HttpCode(201)
  @ApiOperation({ summary: 'Comment on a post' })
  @ApiParam({ name: 'id', required: true, description: 'Post ID' })
  @ApiResponse({ status: 201, description: 'Comment added successfully' })
  @ApiResponse({ status: 404, description: 'Post or user not found' })
  @ApiResponse({ status: 500, description: 'Server error' })
  async commentPost(
    @Param('id', ParseIntPipe) id: number,
    @Req() req: Request & { user: { userId: number } },
    @Body() commentPostDto: AddCommentDTO,
    @Res() res: Response,
  ) {
    try {
      const userId = req.user.userId;
      const newComment = await this.commentsService.commentPost(
        id,
        userId,
        commentPostDto,
      );
      return successResponse(
        res,
        'Comment added successfully',
        HttpStatus.CREATED,
        newComment,
      );
    } catch (error) {
      this.logger.error(error.message);
      return errorResponse(res, error.status || 500, error.message);
    }
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get all comments for a post' })
  @ApiParam({ name: 'id', required: true, description: 'Post ID' })
  @ApiResponse({ status: 200, description: 'Comments retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Post not found' })
  @ApiResponse({ status: 500, description: 'Server error' })
  async getComments(
    @Param('id', ParseIntPipe) id: number,
    @Res() res: Response,
  ) {
    try {
      const comments = await this.commentsService.getComments(id);
      return successResponse(
        res,
        'Comments retrieved successfully',
        HttpStatus.OK,
        comments,
      );
    } catch (error) {
      this.logger.error(error.message);
      return errorResponse(res, error.status || 500, error.message);
    }
  }

  @Put(':id')
  @ApiOperation({ summary: 'Edit a comment' })
  @ApiParam({ name: 'id', required: true, description: 'Comment ID' })
  @ApiResponse({ status: 201, description: 'Comment updated successfully' })
  @ApiResponse({ status: 404, description: 'Comment not found' })
  @ApiResponse({ status: 500, description: 'Server error' })
  async editComment(
    @Param('id', ParseIntPipe) id: number,
    @Res() res: Response,
    @Body() editCommentDto: EditCommentDTO,
  ) {
    try {
      const comments = await this.commentsService.editComment(
        id,
        editCommentDto,
      );
      return successResponse(
        res,
        'Comment updated successfully',
        HttpStatus.OK,
        comments,
      );
    } catch (error) {
      this.logger.error(error.message);
      return errorResponse(res, error.status || 500, error.message);
    }
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a comment' })
  @ApiParam({ name: 'id', required: true, description: 'Comment ID' })
  @ApiResponse({ status: 201, description: 'Comment deleted successfully' })
  @ApiResponse({ status: 404, description: 'Comment not found' })
  @ApiResponse({ status: 500, description: 'Server error' })
  async deleteComment(
    @Param('id', ParseIntPipe) id: number,
    @Res() res: Response,
  ) {
    try {
      const comments = await this.commentsService.deleteComment(id);
      return successResponse(
        res,
        'Comment deleted successfully',
        HttpStatus.OK,
        comments,
      );
    } catch (error) {
      this.logger.error(error.message);
      return errorResponse(res, error.status || 500, error.message);
    }
  }

  @ApiOperation({ summary: 'Like or unlike comment' })
  @ApiParam({ name: 'id', required: true, description: 'Comment ID' })
  @ApiResponse({
    status: 200,
    description: 'Comment liked/unliked successfully',
  })
  @ApiResponse({ status: 404, description: 'Comment not found' })
  @ApiResponse({ status: 500, description: 'Server error' })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Patch(':id/like')
  async likePost(
    @Param('id', ParseIntPipe) id: number,
    @Req() req: Request & { user: { userId: number } },
    @Res() res: Response,
  ) {
    try {
      const userId = req.user.userId;
      const { message, post } = await this.commentsService.likeComment(
        id,
        userId,
      );
      return successResponse(res, message, HttpStatus.OK, post);
    } catch (error) {
      this.logger.error(error.message);
      return errorResponse(res, error.status || 500, error.message);
    }
  }
}
