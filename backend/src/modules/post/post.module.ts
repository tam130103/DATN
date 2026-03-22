import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PostService } from './post.service';
import { PostController } from './post.controller';
import { FacebookWebhookController } from './facebook-webhook.controller';
import { Post } from './entities/post.entity';
import { Media } from './entities/media.entity';
import { Hashtag } from './entities/hashtag.entity';
import { PostHashtag } from './entities/post-hashtag.entity';
import { PostMention } from './entities/post-mention.entity';
import { Follow } from '../user/entities/follow.entity';
import { User } from '../user/entities/user.entity';
import { Like } from '../engagement/entities/like.entity';
import { Comment } from '../engagement/entities/comment.entity';
import { UserModule } from '../user/user.module';
import { FacebookSyncService } from './facebook-sync.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([Post, Media, Hashtag, PostHashtag, PostMention, Follow, User, Like, Comment]),
    forwardRef(() => UserModule),
  ],
  controllers: [PostController, FacebookWebhookController],
  providers: [PostService, FacebookSyncService],
  exports: [PostService],
})
export class PostModule {}
