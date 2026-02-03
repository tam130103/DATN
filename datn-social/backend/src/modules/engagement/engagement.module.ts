import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EngagementService } from './engagement.service';
import { EngagementController } from './engagement.controller';
import { Like } from './entities/like.entity';
import { Comment } from './entities/comment.entity';
import { Post } from '../post/entities/post.entity';
import { NotificationModule } from '../notification/notification.module';

@Module({
  imports: [TypeOrmModule.forFeature([Like, Comment, Post]), NotificationModule],
  controllers: [EngagementController],
  providers: [EngagementService],
  exports: [EngagementService],
})
export class EngagementModule {}
