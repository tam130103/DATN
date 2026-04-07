import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AdminController, ReportController } from './admin.controller';
import { AdminService } from './admin.service';
import { Report } from './entities/report.entity';
import { User } from '../user/entities/user.entity';
import { Post } from '../post/entities/post.entity';
import { Comment } from '../engagement/entities/comment.entity';
import { Like } from '../engagement/entities/like.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([User, Post, Comment, Like, Report]),
  ],
  controllers: [AdminController, ReportController],
  providers: [AdminService],
  exports: [AdminService],
})
export class AdminModule {}
