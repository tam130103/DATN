import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PostService } from './post.service';
import { PostController } from './post.controller';
import { Post } from './entities/post.entity';
import { Media } from './entities/media.entity';
import { Hashtag } from './entities/hashtag.entity';
import { PostHashtag } from './entities/post-hashtag.entity';
import { PostMention } from './entities/post-mention.entity';
import { Follow } from '../user/entities/follow.entity';
import { User } from '../user/entities/user.entity';
import { Like } from '../engagement/entities/like.entity';
import { Comment } from '../engagement/entities/comment.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Post, Media, Hashtag, PostHashtag, PostMention, Follow, User, Like, Comment])],
  controllers: [PostController],
  providers: [PostService],
  exports: [PostService],
})
export class PostModule {}
