import {
  Controller,
  Get,
  Post,
  Delete,
  Patch,
  Body,
  Param,
  Query,
  UseGuards,
  ParseIntPipe,
  UseInterceptors,
  UploadedFile,
  Req,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Request } from 'express';
import { PostService } from './post.service';
import { CreatePostDto } from './dto/create-post.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { CloudinaryService } from '../cloudinary/cloudinary.service';
import { AIService } from '../ai/ai.service';


@Controller('posts')
@UseGuards(JwtAuthGuard)
export class PostController {
  constructor(
    private readonly postService: PostService,
    private readonly cloudinaryService: CloudinaryService,
    private readonly aiService: AIService,
  ) {}

  @Post('upload')
  @UseInterceptors(
    FileInterceptor('file', {
      limits: { fileSize: 20 * 1024 * 1024 },
    }),
  )
  async uploadMedia(@UploadedFile() file: any) {
    if (!file) {
      throw new BadRequestException('File is required');
    }

    if (!file.mimetype.startsWith('image/') && !file.mimetype.startsWith('video/')) {
      throw new BadRequestException('Only image or video files are allowed');
    }

    const folder = file.mimetype.startsWith('video/') ? 'datn-social/videos' : 'datn-social/images';
    const result = await this.cloudinaryService.uploadFile(file, folder);
    
    return { url: result.secure_url };
  }

  @Post()
  create(@CurrentUser() user: any, @Body() createPostDto: CreatePostDto) {
    return this.postService.create(user.id, createPostDto);
  }

  @Post('import/facebook')
  importFromFacebook(
    @CurrentUser() user: any,
    @Body() body: { pageId?: string; accessToken?: string; limit?: number },
  ) {
    return this.postService.importFromFacebookPage(user.id, body);
  }

  @Get('feed')
  getFeed(
    @CurrentUser() user: any,
    @Query('cursor') cursor?: string,
    @Query('limit', new ParseIntPipe({ optional: true })) limit = 20,
  ) {
    return this.postService.getFeed(user.id, cursor, limit);
  }

  @Get('user/:id')
  getByUser(
    @CurrentUser() user: any,
    @Param('id') id: string,
    @Query('cursor') cursor?: string,
    @Query('limit', new ParseIntPipe({ optional: true })) limit = 24,
  ) {
    return this.postService.getPostsByUser(id, user.id, cursor, limit);
  }

  @Get('user/:id/tagged')
  getTaggedPosts(
    @CurrentUser() user: any,
    @Param('id') id: string,
    @Query('cursor') cursor?: string,
    @Query('limit', new ParseIntPipe({ optional: true })) limit = 24,
  ) {
    return this.postService.getTaggedPosts(id, user.id, cursor, limit);
  }

  @Get('user/:id/saved')
  getSavedPosts(
    @CurrentUser() user: any,
    @Param('id') id: string,
    @Query('cursor') cursor?: string,
    @Query('limit', new ParseIntPipe({ optional: true })) limit = 24,
  ) {
    return this.postService.getSavedPosts(id, user.id, cursor, limit);
  }

  @Get(':id')
  getById(@Param('id') id: string) {
    return this.postService.findById(id);
  }

  @Patch(':id/pin')
  togglePin(@CurrentUser() user: any, @Param('id') id: string) {
    return this.postService.togglePin(id, user.id);
  }

  @Patch(':id')
  update(@CurrentUser() user: any, @Param('id') id: string, @Body() body: { caption: string }) {
    return this.postService.updateCaption(id, user.id, body.caption);
  }

  @Delete(':id')
  delete(@CurrentUser() user: any, @Param('id') id: string) {
    return this.postService.delete(id, user.id);
  }

  @Post('ai/generate-caption')
  async generateCaption(@Body() body: { prompt: string; tone?: string }) {
    const prompt = body.prompt?.trim();
    if (!prompt) {
      throw new BadRequestException('Vui lòng nhập chủ đề hoặc từ khóa để AI tạo nội dung.');
    }
    return this.aiService.generateCaptionResult(prompt, body.tone?.trim());
  }

  @Post('ai/suggest-hashtags')
  async suggestHashtags(@Body() body: { text: string }) {
    const text = body.text?.trim();
    if (!text) {
      throw new BadRequestException('Vui lòng nhập nội dung trước khi gợi ý hashtag.');
    }
    return this.aiService.suggestHashtagsResult(text);
  }
}

