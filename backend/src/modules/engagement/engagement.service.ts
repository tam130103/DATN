import { Injectable, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In, IsNull } from 'typeorm';
import { Like } from './entities/like.entity';
import { Comment, CommentStatus } from './entities/comment.entity';
import { CommentLike } from './entities/comment-like.entity';
import { SavedPost } from './entities/saved-post.entity';
import { CreateCommentDto } from './dto/create-comment.dto';
import { Follow } from '../user/entities/follow.entity';
import { NotificationService } from '../notification/notification.service';
import { NotificationGateway } from '../notification/notification.gateway';
import { Post, PostStatus } from '../post/entities/post.entity';

@Injectable()
export class EngagementService {
  constructor(
    @InjectRepository(Like)
    private readonly likeRepository: Repository<Like>,
    @InjectRepository(Comment)
    private readonly commentRepository: Repository<Comment>,
    @InjectRepository(CommentLike)
    private readonly commentLikeRepository: Repository<CommentLike>,
    @InjectRepository(SavedPost)
    private readonly savedPostRepository: Repository<SavedPost>,
    @InjectRepository(Post)
    private readonly postRepository: Repository<Post>,
    @InjectRepository(Follow)
    private readonly followRepository: Repository<Follow>,
    private readonly notificationService: NotificationService,
    private readonly notificationGateway: NotificationGateway,
  ) {}

  async toggleLike(userId: string, postId: string): Promise<{ liked: boolean; likesCount: number }> {
    const existingLike = await this.likeRepository.findOne({
      where: { userId, postId },
    });

    if (existingLike) {
      await this.likeRepository.remove(existingLike);
      const likesCount = await this.likeRepository.count({ where: { postId } });
      return { liked: false, likesCount };
    }

    // Check if user is liking their own post AND post is visible
    const post = await this.postRepository.findOne({
      where: { id: postId, status: PostStatus.VISIBLE },
      select: ['id', 'userId'],
    });

    if (!post) {
      throw new NotFoundException('Post not found or unavailable');
    }

    if (post.userId !== userId) {
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
    const likesCount = await this.likeRepository.count({ where: { postId } });
    return { liked: true, likesCount };
  }

  async getPostLikes(postId: string): Promise<Like[]> {
    return this.likeRepository.find({
      where: { postId },
      relations: ['user'],
      order: { createdAt: 'DESC' },
    });
  }

  async createComment(userId: string, postId: string, createCommentDto: CreateCommentDto): Promise<Comment> {
    // Check if user is commenting on their own post AND post is visible
    const post = await this.postRepository.findOne({
      where: { id: postId, status: PostStatus.VISIBLE },
      select: ['id', 'userId'],
    });

    if (!post) {
      throw new NotFoundException('Post not found or unavailable');
    }

    let resolvedParentId: string | undefined = createCommentDto.parentId;

    // Validate reply logic
    if (resolvedParentId) {
      const parentComment = await this.commentRepository.findOne({
        where: { id: resolvedParentId, postId, status: CommentStatus.VISIBLE },
      });

      if (!parentComment) {
        throw new BadRequestException('Parent comment not found or unavailable');
      }

      // Flatten to 1 level: if parent is already a reply, use its parentId instead
      if (parentComment.parentId) {
        resolvedParentId = parentComment.parentId;
      }
    }

    const comment = this.commentRepository.create({
      userId,
      postId,
      content: createCommentDto.content,
      parentId: resolvedParentId,
      replyToUserId: createCommentDto.replyToUserId,
    });
    const savedComment = await this.commentRepository.save(comment);

    // Reload with user relation so the response includes full user info
    const fullComment = await this.commentRepository.findOne({
      where: { id: savedComment.id },
      relations: ['user', 'replyToUser'],
    });

    if (resolvedParentId) {
      // Reply → notify parent comment author
      const parentComment = await this.commentRepository.findOne({
        where: { id: resolvedParentId },
        select: ['id', 'userId'],
      });

      if (parentComment && parentComment.userId !== userId) {
        const notification = await this.notificationService.createReplyNotification(
          userId,
          parentComment.userId,
          postId,
          savedComment.id,
          resolvedParentId,
        );
        if (notification) {
          this.notificationGateway.emitToUser(parentComment.userId, 'notification', notification);
        }
      }
    } else if (post.userId !== userId) {
      // Root comment → notify post owner
      const notification = await this.notificationService.createCommentNotification(
        userId,
        post.userId,
        postId,
        savedComment.id,
      );

      // Emit realtime notification
      this.notificationGateway.emitToUser(post.userId, 'notification', notification);
    }

    return fullComment || savedComment;
  }

  async getPostComments(postId: string, userId: string, page = 1, limit = 20): Promise<any[]> {
    const comments = await this.commentRepository.find({
      where: { postId, parentId: IsNull(), status: CommentStatus.VISIBLE },
      relations: ['user', 'replyToUser'],
      order: { createdAt: 'DESC' },
      take: limit,
      skip: (page - 1) * limit,
    });

    if (comments.length === 0) {
      return comments;
    }

    const commentIds = comments.map(c => c.id);
    const commenterIds = Array.from(new Set(comments.map(c => c.userId)));

    // Get follow info
    let followingSet = new Set<string>();
    if (userId) {
      const follows = await this.followRepository.find({
        where: {
          followerId: userId,
          followingId: In(commenterIds),
        },
      });
      followingSet = new Set(follows.map(f => f.followingId));
    }

    // Get likes count per comment
    const likesCountResults = await this.commentLikeRepository
      .createQueryBuilder('cl')
      .select('cl.comment_id', 'commentId')
      .addSelect('COUNT(*)::int', 'count')
      .where('cl.comment_id IN (:...ids)', { ids: commentIds })
      .groupBy('cl.comment_id')
      .getRawMany();
    const likesCountMap = new Map(likesCountResults.map(r => [r.commentId, r.count]));

    // Get replies count per comment
    const repliesCountResults = await this.commentRepository
      .createQueryBuilder('c')
      .select('c.parent_id', 'parentId')
      .addSelect('COUNT(*)::int', 'count')
      .where('c.parent_id IN (:...ids)', { ids: commentIds })
      .andWhere('c.status = :status', { status: CommentStatus.VISIBLE })
      .groupBy('c.parent_id')
      .getRawMany();
    const repliesCountMap = new Map(repliesCountResults.map(r => [r.parentId, r.count]));

    // Get current user's likes
    let userLikedSet = new Set<string>();
    if (userId) {
      const userLikes = await this.commentLikeRepository.find({
        where: { userId, commentId: In(commentIds) },
        select: ['commentId'],
      });
      userLikedSet = new Set(userLikes.map(l => l.commentId));
    }

    return comments.map(comment => {
      if (comment.user) {
        comment.user.isFollowing = followingSet.has(comment.user.id);
      }
      return {
        ...comment,
        liked: userLikedSet.has(comment.id),
        likesCount: likesCountMap.get(comment.id) || 0,
        repliesCount: repliesCountMap.get(comment.id) || 0,
      };
    });
  }

  async getCommentReplies(
    commentId: string,
    userId: string,
    page = 1,
    limit = 20,
  ): Promise<any[]> {
    const replies = await this.commentRepository.find({
      where: { parentId: commentId, status: CommentStatus.VISIBLE },
      relations: ['user', 'replyToUser'],
      order: { createdAt: 'ASC' },
      take: limit,
      skip: (page - 1) * limit,
    });

    if (replies.length === 0) {
      return replies;
    }

    const replyIds = replies.map(r => r.id);

    // Get likes count per reply
    const likesCountResults = await this.commentLikeRepository
      .createQueryBuilder('cl')
      .select('cl.comment_id', 'commentId')
      .addSelect('COUNT(*)::int', 'count')
      .where('cl.comment_id IN (:...ids)', { ids: replyIds })
      .groupBy('cl.comment_id')
      .getRawMany();
    const likesCountMap = new Map(likesCountResults.map(r => [r.commentId, r.count]));

    // Get current user's likes
    let userLikedSet = new Set<string>();
    if (userId) {
      const userLikes = await this.commentLikeRepository.find({
        where: { userId, commentId: In(replyIds) },
        select: ['commentId'],
      });
      userLikedSet = new Set(userLikes.map(l => l.commentId));
    }

    return replies.map(reply => ({
      ...reply,
      liked: userLikedSet.has(reply.id),
      likesCount: likesCountMap.get(reply.id) || 0,
    }));
  }

  async toggleCommentLike(
    userId: string,
    commentId: string,
  ): Promise<{ liked: boolean; likesCount: number }> {
    const comment = await this.commentRepository.findOne({
      where: { id: commentId, status: CommentStatus.VISIBLE },
      select: ['id', 'userId', 'postId'],
    });

    if (!comment) {
      throw new NotFoundException('Comment not found or unavailable');
    }

    const existingLike = await this.commentLikeRepository.findOne({
      where: { userId, commentId },
    });

    if (existingLike) {
      await this.commentLikeRepository.remove(existingLike);
      const likesCount = await this.commentLikeRepository.count({ where: { commentId } });
      return { liked: false, likesCount };
    }

    const newLike = this.commentLikeRepository.create({ userId, commentId });
    await this.commentLikeRepository.save(newLike);
    const likesCount = await this.commentLikeRepository.count({ where: { commentId } });

    // Notify comment author
    if (comment.userId !== userId) {
      const notification = await this.notificationService.createCommentLikeNotification(
        userId,
        comment.userId,
        comment.postId,
        commentId,
        comment.parentId,
      );
      if (notification) {
        this.notificationGateway.emitToUser(comment.userId, 'notification', notification);
      }
    }

    return { liked: true, likesCount };
  }

  async deleteComment(commentId: string, userId: string): Promise<void> {
    const comment = await this.commentRepository.findOne({
      where: { id: commentId },
    });

    if (!comment) {
      throw new NotFoundException('Comment not found');
    }

    if (comment.userId !== userId) {
      throw new ForbiddenException('You are not authorized to delete this comment');
    }

    await this.commentRepository.remove(comment);
  }

  async updateComment(commentId: string, userId: string, content: string): Promise<Comment> {
    const comment = await this.commentRepository.findOne({
      where: { id: commentId },
      relations: ['user'],
    });

    if (!comment) {
      throw new NotFoundException('Comment not found');
    }

    if (comment.userId !== userId) {
      throw new ForbiddenException('You are not authorized to edit this comment');
    }

    comment.content = content;
    return this.commentRepository.save(comment);
  }

  async toggleSave(userId: string, postId: string): Promise<{ saved: boolean }> {
    const post = await this.postRepository.findOne({
      where: { id: postId, status: PostStatus.VISIBLE },
      select: ['id'],
    });

    if (!post) {
      throw new NotFoundException('Post not found or unavailable');
    }

    const existing = await this.savedPostRepository.findOne({
      where: { userId, postId },
    });

    if (existing) {
      await this.savedPostRepository.remove(existing);
      return { saved: false };
    }

    const savedPost = this.savedPostRepository.create({ userId, postId });
    await this.savedPostRepository.save(savedPost);
    return { saved: true };
  }
}
