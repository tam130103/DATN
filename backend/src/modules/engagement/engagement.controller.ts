import {
  Controller,
  Post,
  Delete,
  Get,
  Body,
  Param,
  Query,
  UseGuards,
  ParseIntPipe,
  DefaultValuePipe,
} from '@nestjs/common';
import { EngagementService } from './engagement.service';
import { CreateCommentDto } from './dto/create-comment.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@Controller('posts')
@UseGuards(JwtAuthGuard)
export class EngagementController {
  constructor(private readonly engagementService: EngagementService) {}

  @Post(':id/like')
  toggleLike(@CurrentUser() user: any, @Param('id') postId: string) {
    return this.engagementService.toggleLike(user.id, postId);
  }

  @Delete(':id/like')
  unlike(@CurrentUser() user: any, @Param('id') postId: string) {
    return this.engagementService.toggleLike(user.id, postId);
  }

  @Post(':id/save')
  toggleSave(@CurrentUser() user: any, @Param('id') postId: string) {
    return this.engagementService.toggleSave(user.id, postId);
  }

  @Delete(':id/save')
  unsave(@CurrentUser() user: any, @Param('id') postId: string) {
    return this.engagementService.toggleSave(user.id, postId);
  }

  @Post(':id/comments')
  createComment(
    @CurrentUser() user: any,
    @Param('id') postId: string,
    @Body() createCommentDto: CreateCommentDto,
  ) {
    return this.engagementService.createComment(user.id, postId, createCommentDto);
  }

  @Get(':id/comments')
  getPostComments(
    @Param('id') postId: string,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit: number,
  ) {
    return this.engagementService.getPostComments(postId, page, limit);
  }

  @Delete('comments/:commentId')
  deleteComment(@CurrentUser() user: any, @Param('commentId') commentId: string) {
    return this.engagementService.deleteComment(commentId, user.id);
  }
}
