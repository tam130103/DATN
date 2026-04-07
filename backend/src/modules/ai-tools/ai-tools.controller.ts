import { Controller, Get, Query, Headers, UnauthorizedException, BadRequestException } from '@nestjs/common';
import { AiToolsService } from './ai-tools.service';

@Controller('ai-tools')
export class AiToolsController {
  // Simple protection so the endpoint isn't abused
  private readonly AI_TOOL_KEY = 'datn-tool-secret-key-123';

  constructor(private readonly aiToolsService: AiToolsService) {}

  private verifyKey(key?: string) {
    if (key !== this.AI_TOOL_KEY) {
      throw new UnauthorizedException('Invalid or missing X-Datn-Tool-Key header');
    }
  }

  @Get('posts/count')
  async getPostsCount(@Headers('X-Datn-Tool-Key') key: string) {
    this.verifyKey(key);
    const count = await this.aiToolsService.getPostsCount();
    return { 
      success: true,
      data: {
        total_posts: count 
      }
    };
  }

  @Get('posts/search')
  async searchPosts(
    @Headers('X-Datn-Tool-Key') key: string,
    @Query('q') query: string,
    @Query('limit') limitArg?: string,
  ) {
    this.verifyKey(key);
    
    if (!query) {
      throw new BadRequestException('Query parameter "q" is required');
    }

    const limit = limitArg ? parseInt(limitArg, 10) : 5;
    const posts = await this.aiToolsService.searchPosts(query, limit);
    return {
      success: true,
      data: {
        posts,
        count: posts.length
      }
    };
  }
}
