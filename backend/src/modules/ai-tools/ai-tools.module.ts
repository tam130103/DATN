import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AiToolsController } from './ai-tools.controller';
import { AiToolsService } from './ai-tools.service';
import { Post } from '../post/entities/post.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Post])],
  controllers: [AiToolsController],
  providers: [AiToolsService],
})
export class AiToolsModule {}
