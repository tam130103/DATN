import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AiToolsController } from './ai-tools.controller';
import { AiToolsService } from './ai-tools.service';
import { Post } from '../post/entities/post.entity';
import { User } from '../user/entities/user.entity';
import { Comment } from '../engagement/entities/comment.entity';
import { Like } from '../engagement/entities/like.entity';
import { Hashtag } from '../search/entities/hashtag.entity';
import { Report } from '../admin/entities/report.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Post, User, Comment, Like, Hashtag, Report])],
  controllers: [AiToolsController],
  providers: [AiToolsService],
})
export class AiToolsModule {}
