import {
  Controller,
  Get,
  Post,
  Delete,
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
import { diskStorage } from 'multer';
import { extname, join } from 'path';
import { existsSync, mkdirSync } from 'fs';
import { Request } from 'express';
import { PostService } from './post.service';
import { CreatePostDto } from './dto/create-post.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

const uploadDir = join(process.cwd(), process.env.UPLOAD_DIR || 'uploads');
if (!existsSync(uploadDir)) {
  mkdirSync(uploadDir, { recursive: true });
}

@Controller('posts')
@UseGuards(JwtAuthGuard)
export class PostController {
  constructor(private readonly postService: PostService) {}

  @Post('upload')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: uploadDir,
        filename: (_req, file, cb) => {
          const uniqueName = `${Date.now()}-${Math.round(Math.random() * 1e9)}${extname(file.originalname)}`;
          cb(null, uniqueName);
        },
      }),
      limits: { fileSize: 20 * 1024 * 1024 },
    }),
  )
  uploadMedia(@UploadedFile() file: { filename: string; mimetype: string }, @Req() req: Request) {
    if (!file) {
      throw new BadRequestException('File is required');
    }

    if (!file.mimetype.startsWith('image/') && !file.mimetype.startsWith('video/')) {
      throw new BadRequestException('Only image or video files are allowed');
    }

    const baseUrl = `${req.protocol}://${req.get('host')}`;
    return { url: `${baseUrl}/uploads/${file.filename}` };
  }

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

  @Get('user/:id')
  getByUser(
    @CurrentUser() user: any,
    @Param('id') id: string,
    @Query('cursor') cursor?: string,
    @Query('limit', new ParseIntPipe({ optional: true })) limit = 24,
  ) {
    return this.postService.getPostsByUser(id, user.id, cursor, limit);
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

