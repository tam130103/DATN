import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SearchService } from './search.service';
import { SearchController } from './search.controller';
import { User } from '../user/entities/user.entity';
import { Hashtag } from './entities/hashtag.entity';
import { Post } from '../post/entities/post.entity';
import { PostHashtag } from '../post/entities/post-hashtag.entity';

@Module({
  imports: [TypeOrmModule.forFeature([User, Hashtag, Post, PostHashtag])],
  controllers: [SearchController],
  providers: [SearchService],
  exports: [SearchService],
})
export class SearchModule {}
