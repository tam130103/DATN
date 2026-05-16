import {
  Controller,
  Post,
  Delete,
  Get,
  Patch,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { EngagementService } from './engagement.service';
import { CreateCommentDto } from './dto/create-comment.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser, RequestUser } from '../auth/decorators/current-user.decorator';
import { limitPipe, pagePipe } from '../../common/pipes/bounded-int.pipe';

@Controller('posts')
@UseGuards(JwtAuthGuard)
export class EngagementController {
  constructor(private readonly engagementService: EngagementService) {}

  @Post(':id/like')
  toggleLike(@CurrentUser() user: RequestUser, @Param('id') postId: string) {
    return this.engagementService.toggleLike(user.id, postId);
  }

  @Delete(':id/like')
  unlike(@CurrentUser() user: RequestUser, @Param('id') postId: string) {
    return this.engagementService.unlike(user.id, postId);
  }

  @Post(':id/save')
  toggleSave(@CurrentUser() user: RequestUser, @Param('id') postId: string) {
    return this.engagementService.toggleSave(user.id, postId);
  }

  @Delete(':id/save')
  unsave(@CurrentUser() user: RequestUser, @Param('id') postId: string) {
    return this.engagementService.unsave(user.id, postId);
  }

  @Post(':id/comments')
  createComment(
    @CurrentUser() user: RequestUser,
    @Param('id') postId: string,
    @Body() createCommentDto: CreateCommentDto,
  ) {
    return this.engagementService.createComment(user.id, postId, createCommentDto);
  }

  @Get(':id/comments')
  getPostComments(
    @CurrentUser() user: RequestUser,
    @Param('id') postId: string,
    @Query('page', pagePipe()) page: number,
    @Query('limit', limitPipe(20)) limit: number,
  ) {
    return this.engagementService.getPostComments(postId, user?.id, page, limit);
  }

  @Get('comments/:commentId/replies')
  getCommentReplies(
    @CurrentUser() user: RequestUser,
    @Param('commentId') commentId: string,
    @Query('page', pagePipe()) page: number,
    @Query('limit', limitPipe(20)) limit: number,
  ) {
    return this.engagementService.getCommentReplies(commentId, user?.id, page, limit);
  }

  @Post('comments/:commentId/like')
  likeComment(@CurrentUser() user: RequestUser, @Param('commentId') commentId: string) {
    return this.engagementService.toggleCommentLike(user.id, commentId);
  }

  @Delete('comments/:commentId/like')
  unlikeComment(@CurrentUser() user: RequestUser, @Param('commentId') commentId: string) {
    return this.engagementService.unlikeComment(user.id, commentId);
  }

  @Patch('comments/:commentId')
  updateComment(
    @CurrentUser() user: RequestUser,
    @Param('commentId') commentId: string,
    @Body('content') content: string,
  ) {
    return this.engagementService.updateComment(commentId, user.id, content);
  }

  @Delete('comments/:commentId')
  deleteComment(@CurrentUser() user: RequestUser, @Param('commentId') commentId: string) {
    return this.engagementService.deleteComment(commentId, user.id);
  }
}
