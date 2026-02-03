import { Controller, Get, Post, Delete, Body, Param, Query, UseGuards, ParseIntPipe } from '@nestjs/common';
import { PostService } from './post.service';
import { CreatePostDto } from './dto/create-post.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@Controller('posts')
@UseGuards(JwtAuthGuard)
export class PostController {
  constructor(private readonly postService: PostService) {}

  @Post()
  create(@CurrentUser() user: any, @Body() createPostDto: CreatePostDto) {
    return this.postService.create(user.id, createPostDto);
  }

  @Get('feed')
  getFeed(
    @CurrentUser() user: any,
    @Query('cursor') cursor?: string,
    @Query('limit', new ParseIntPipe({ optional: true })) limit = 20,
  ) {
    return this.postService.getFeed(user.id, cursor, limit);
  }

  @Get(':id')
  getById(@Param('id') id: string) {
    return this.postService.findById(id);
  }

  @Delete(':id')
  delete(@CurrentUser() user: any, @Param('id') id: string) {
    return this.postService.delete(id, user.id);
  }
}
