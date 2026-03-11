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
  UploadedFiles,
  BadRequestException,
  Req,
} from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import type { Request } from 'express';
import { existsSync, mkdirSync } from 'fs';
import { extname, isAbsolute, join } from 'path';
import { PostService } from './post.service';
import { CreatePostDto } from './dto/create-post.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

const resolveUploadDir = () => {
  const configuredPath = process.env.UPLOAD_DIR || 'uploads';
  const uploadDir = isAbsolute(configuredPath)
    ? configuredPath
    : join(process.cwd(), configuredPath);

  if (!existsSync(uploadDir)) {
    mkdirSync(uploadDir, { recursive: true });
  }

  return uploadDir;
};

@Controller('posts')
@UseGuards(JwtAuthGuard)
export class PostController {
  constructor(private readonly postService: PostService) {}

  @Post('upload')
  @UseInterceptors(
    FilesInterceptor('files', 10, {
      storage: diskStorage({
        destination: (_req, _file, callback) => callback(null, resolveUploadDir()),
        filename: (_req, file, callback) => {
          const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
          callback(null, `${uniqueSuffix}${extname(file.originalname).toLowerCase()}`);
        },
      }),
      limits: {
        fileSize: 25 * 1024 * 1024,
      },
      fileFilter: (_req, file, callback) => {
        if (file.mimetype.startsWith('image/') || file.mimetype.startsWith('video/')) {
          callback(null, true);
          return;
        }

        callback(new Error('Only image and video files are allowed'), false);
      },
    }),
  )
  uploadMedia(@UploadedFiles() files: Array<{ filename: string; mimetype: string; originalname: string }>, @Req() request: Request) {
    if (!files || files.length === 0) {
      throw new BadRequestException('No files uploaded');
    }

    return files.map((file) => ({
      url: `${request.protocol}://${request.get('host')}/uploads/${file.filename}`,
      type: file.mimetype.startsWith('video/') ? 'VIDEO' : 'IMAGE',
      originalName: file.originalname,
    }));
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

  @Get(':id')
  getById(@CurrentUser() user: any, @Param('id') id: string) {
    return this.postService.findById(id, user.id);
  }

  @Delete(':id')
  delete(@CurrentUser() user: any, @Param('id') id: string) {
    return this.postService.delete(id, user.id);
  }
}

