import { Controller, Get, Query, Param, UseGuards } from '@nestjs/common';
import { SearchService } from './search.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser, RequestUser } from '../auth/decorators/current-user.decorator';
import { limitPipe, pagePipe } from '../../common/pipes/bounded-int.pipe';

@Controller('search')
@UseGuards(JwtAuthGuard)
export class SearchController {
  constructor(private readonly searchService: SearchService) {}

  @Get('users')
  searchUsers(
    @Query('q') query: string,
    @Query('page', pagePipe()) page = 1,
    @Query('limit', limitPipe(20)) limit = 20,
  ) {
    return this.searchService.searchUsers(query, page, limit);
  }

  @Get('hashtags')
  searchHashtags(
    @Query('q') query: string,
    @Query('page', pagePipe()) page = 1,
    @Query('limit', limitPipe(20)) limit = 20,
  ) {
    return this.searchService.searchHashtags(query, page, limit);
  }

  @Get('hashtags/:name/posts')
  getHashtagPosts(
    @CurrentUser() user: RequestUser,
    @Param('name') name: string,
    @Query('page', pagePipe()) page = 1,
    @Query('limit', limitPipe(20)) limit = 20,
  ) {
    return this.searchService.getHashtagPosts(name, user.id, page, limit);
  }

  @Get('global')
  globalSearch(
    @Query('q') query: string,
    @Query('page', pagePipe()) page = 1,
    @Query('limit', limitPipe(10)) limit = 10,
  ) {
    return this.searchService.globalSearch(query, page, limit);
  }

  @Get('trending')
  getTrendingHashtags(@Query('limit', limitPipe(10)) limit = 10) {
    return this.searchService.getTrendingHashtags(limit);
  }
}
