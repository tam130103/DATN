import { Controller, Get, Query, Param, UseGuards, ParseIntPipe } from '@nestjs/common';
import { SearchService } from './search.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('search')
@UseGuards(JwtAuthGuard)
export class SearchController {
  constructor(private readonly searchService: SearchService) {}

  @Get('users')
  searchUsers(
    @Query('q') query: string,
    @Query('page', new ParseIntPipe({ optional: true })) page = 1,
    @Query('limit', new ParseIntPipe({ optional: true })) limit = 20,
  ) {
    return this.searchService.searchUsers(query, page, limit);
  }

  @Get('hashtags')
  searchHashtags(
    @Query('q') query: string,
    @Query('page', new ParseIntPipe({ optional: true })) page = 1,
    @Query('limit', new ParseIntPipe({ optional: true })) limit = 20,
  ) {
    return this.searchService.searchHashtags(query, page, limit);
  }

  @Get('hashtags/:name/posts')
  getHashtagPosts(
    @Param('name') name: string,
    @Query('page', new ParseIntPipe({ optional: true })) page = 1,
    @Query('limit', new ParseIntPipe({ optional: true })) limit = 20,
  ) {
    return this.searchService.getHashtagPosts(name, page, limit);
  }

  @Get('global')
  globalSearch(
    @Query('q') query: string,
    @Query('page', new ParseIntPipe({ optional: true })) page = 1,
    @Query('limit', new ParseIntPipe({ optional: true })) limit = 10,
  ) {
    return this.searchService.globalSearch(query, page, limit);
  }

  @Get('trending')
  getTrendingHashtags(@Query('limit', new ParseIntPipe({ optional: true })) limit = 10) {
    return this.searchService.getTrendingHashtags(limit);
  }
}
