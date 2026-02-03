import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Like } from './entities/like.entity';
import { Comment } from './entities/comment.entity';
import { CreateCommentDto } from './dto/create-comment.dto';
import { NotificationService } from '../notification/notification.service';
import { NotificationGateway } from '../notification/notification.gateway';
import { Post } from '../post/entities/post.entity';

@Injectable()
export class EngagementService {
  constructor(
    @InjectRepository(Like)
    private readonly likeRepository: Repository<Like>,
    @InjectRepository(Comment)
    private readonly commentRepository: Repository<Comment>,
    @InjectRepository(Post)
    private readonly postRepository: Repository<Post>,
    private readonly notificationService: NotificationService,
    private readonly notificationGateway: NotificationGateway,
  ) {}

  async toggleLike(userId: string, postId: string): Promise<{ liked: boolean }> {
    const existingLike = await this.likeRepository.findOne({
      where: { userId, postId },
    });

    if (existingLike) {
      await this.likeRepository.remove(existingLike);
      return { liked: false };
    }

    // Check if user is liking their own post
    const post = await this.postRepository.findOne({
      where: { id: postId },
      select: ['userId'],
    });

    if (post && post.userId !== userId) {
      // Create notification
      const notification = await this.notificationService.createLikeNotification(
        userId,
        post.userId,
        postId,
      );

      // Emit realtime notification
      this.notificationGateway.emitToUser(post.userId, 'notification', notification);
    }

    const like = this.likeRepository.create({ userId, postId });
    await this.likeRepository.save(like);
    return { liked: true };
  }

  async getPostLikes(postId: string): Promise<Like[]> {
    return this.likeRepository.find({
      where: { postId },
      relations: ['user'],
      order: { createdAt: 'DESC' },
    });
  }

  async createComment(userId: string, postId: string, createCommentDto: CreateCommentDto): Promise<Comment> {
    // Check if user is commenting on their own post
    const post = await this.postRepository.findOne({
      where: { id: postId },
      select: ['userId'],
    });

    const comment = this.commentRepository.create({
      userId,
      postId,
      content: createCommentDto.content,
      parentId: createCommentDto.parentId,
    });
    const savedComment = await this.commentRepository.save(comment);

    if (post && post.userId !== userId) {
      // Create notification
      const notification = await this.notificationService.createCommentNotification(
        userId,
        post.userId,
        postId,
        savedComment.id,
      );

      // Emit realtime notification
      this.notificationGateway.emitToUser(post.userId, 'notification', notification);
    }

    return savedComment;
  }

  async getPostComments(postId: string, page = 1, limit = 20): Promise<Comment[]> {
    return this.commentRepository.find({
      where: { postId, parentId: null },
      relations: ['user'],
      order: { createdAt: 'DESC' },
      take: limit,
      skip: (page - 1) * limit,
    });
  }

  async deleteComment(commentId: string, userId: string): Promise<void> {
    const comment = await this.commentRepository.findOne({
      where: { id: commentId },
    });

    if (!comment || comment.userId !== userId) {
      throw new Error('Comment not found or unauthorized');
    }

    await this.commentRepository.remove(comment);
  }
}
