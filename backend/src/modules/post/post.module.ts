import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PostService } from './post.service';
import { PostController } from './post.controller';
import { Post } from './entities/post.entity';
import { Media } from './entities/media.entity';
import { Hashtag } from './entities/hashtag.entity';
import { PostHashtag } from './entities/post-hashtag.entity';
import { Follow } from '../user/entities/follow.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Post, Media, Hashtag, PostHashtag, Follow])],
  controllers: [PostController],
  providers: [PostService],
  exports: [PostService],
})
export class PostModule {}
