import {
  BadRequestException,
  Controller,
  Get,
  Headers,
  Param,
  Query,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ReportStatus } from '../admin/entities/report.entity';
import { AiToolsService } from './ai-tools.service';

@Controller('ai-tools')
export class AiToolsController {
  constructor(
    private readonly aiToolsService: AiToolsService,
    private readonly configService: ConfigService,
  ) {}

  private verifyKey(key?: string) {
    const toolKey =
      this.configService.get<string>('AI_TOOL_KEY') || 'datn-tool-secret-key-123';

    if (key !== toolKey) {
      throw new UnauthorizedException('Invalid or missing X-Datn-Tool-Key header');
    }
  }

  private parseLimit(limitArg?: string, defaultLimit = 5, maxLimit = 20) {
    const parsed = limitArg ? parseInt(limitArg, 10) : defaultLimit;
    if (Number.isNaN(parsed) || parsed <= 0) {
      throw new BadRequestException('Query parameter "limit" must be a positive integer');
    }
    return Math.min(parsed, maxLimit);
  }

  private parseRequiredQuery(query?: string, fieldName = 'q') {
    if (!query || query.trim().length === 0) {
      throw new BadRequestException(`Query parameter "${fieldName}" is required`);
    }

    return query.trim();
  }

  @Get('dashboard/overview')
  async getDashboardStats(@Headers('X-Datn-Tool-Key') key: string) {
    this.verifyKey(key);

    return {
      success: true,
      data: await this.aiToolsService.getDashboardStats(),
    };
  }

  @Get('posts/count')
  async getPostsCount(@Headers('X-Datn-Tool-Key') key: string) {
    this.verifyKey(key);

    return {
      success: true,
      data: {
        total_posts: await this.aiToolsService.getPostsCount(),
      },
    };
  }

  @Get('posts/search')
  async searchPosts(
    @Headers('X-Datn-Tool-Key') key: string,
    @Query('q') query: string,
    @Query('limit') limitArg?: string,
  ) {
    this.verifyKey(key);

    const normalizedQuery = this.parseRequiredQuery(query);
    const limit = this.parseLimit(limitArg);
    const posts = await this.aiToolsService.searchPosts(normalizedQuery, limit);

    return {
      success: true,
      data: {
        posts,
        count: posts.length,
      },
    };
  }

  @Get('posts/recent')
  async getRecentPosts(
    @Headers('X-Datn-Tool-Key') key: string,
    @Query('limit') limitArg?: string,
  ) {
    this.verifyKey(key);

    const posts = await this.aiToolsService.getRecentPosts(this.parseLimit(limitArg));
    return {
      success: true,
      data: {
        posts,
        count: posts.length,
      },
    };
  }

  @Get('posts/top')
  async getTopPosts(
    @Headers('X-Datn-Tool-Key') key: string,
    @Query('limit') limitArg?: string,
  ) {
    this.verifyKey(key);

    const posts = await this.aiToolsService.getTopPosts(this.parseLimit(limitArg));
    return {
      success: true,
      data: {
        posts,
        count: posts.length,
      },
    };
  }

  @Get('users/search')
  async searchUsers(
    @Headers('X-Datn-Tool-Key') key: string,
    @Query('q') query: string,
    @Query('limit') limitArg?: string,
  ) {
    this.verifyKey(key);

    const normalizedQuery = this.parseRequiredQuery(query);
    const users = await this.aiToolsService.searchUsers(
      normalizedQuery,
      this.parseLimit(limitArg),
    );

    return {
      success: true,
      data: {
        users,
        count: users.length,
      },
    };
  }

  @Get('users/:idOrUsername')
  async getUserProfile(
    @Headers('X-Datn-Tool-Key') key: string,
    @Param('idOrUsername') idOrUsername: string,
  ) {
    this.verifyKey(key);

    return {
      success: true,
      data: await this.aiToolsService.getUserProfile(idOrUsername),
    };
  }

  @Get('users/:idOrUsername/status')
  async getUserStatus(
    @Headers('X-Datn-Tool-Key') key: string,
    @Param('idOrUsername') idOrUsername: string,
  ) {
    this.verifyKey(key);

    return {
      success: true,
      data: await this.aiToolsService.getUserStatus(idOrUsername),
    };
  }

  @Get('hashtags/search')
  async searchHashtags(
    @Headers('X-Datn-Tool-Key') key: string,
    @Query('q') query: string,
    @Query('limit') limitArg?: string,
  ) {
    this.verifyKey(key);

    const normalizedQuery = this.parseRequiredQuery(query);
    const hashtags = await this.aiToolsService.searchHashtags(
      normalizedQuery,
      this.parseLimit(limitArg),
    );

    return {
      success: true,
      data: {
        hashtags,
        count: hashtags.length,
      },
    };
  }

  @Get('hashtags/trending')
  async getTrendingHashtags(
    @Headers('X-Datn-Tool-Key') key: string,
    @Query('limit') limitArg?: string,
  ) {
    this.verifyKey(key);

    const hashtags = await this.aiToolsService.getTrendingHashtags(
      this.parseLimit(limitArg),
    );

    return {
      success: true,
      data: {
        hashtags,
        count: hashtags.length,
      },
    };
  }

  @Get('reports/posts')
  async getReportedPosts(
    @Headers('X-Datn-Tool-Key') key: string,
    @Query('limit') limitArg?: string,
    @Query('status') status?: ReportStatus,
  ) {
    this.verifyKey(key);

    if (status && !Object.values(ReportStatus).includes(status)) {
      throw new BadRequestException('Query parameter "status" is invalid');
    }

    const reports = await this.aiToolsService.getReportedPosts(
      this.parseLimit(limitArg),
      status,
    );

    return {
      success: true,
      data: {
        reports,
        count: reports.length,
      },
    };
  }
}
