import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { Notification, NotificationType } from './entities/notification.entity';
import { User } from '../user/entities/user.entity';
import { UserService } from '../user/user.service';

@Injectable()
export class NotificationService {
  constructor(
    @InjectRepository(Notification)
    private readonly notificationRepository: Repository<Notification>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly userService: UserService,
  ) {}

  async create(
    recipientId: string,
    senderId: string,
    type: NotificationType,
    data?: Record<string, any>,
  ): Promise<Notification | null> {
    if (recipientId === senderId) {
      return null;
    }

    const recipient = await this.userService.findById(recipientId);
    if (recipient.notificationEnabled === false) {
      return null;
    }

    const notification = this.notificationRepository.create({
      recipientId,
      senderId,
      type,
      data,
    });
    
    const savedNotification = await this.notificationRepository.save(notification);
    savedNotification.sender = await this.userService.findById(senderId);
    
    return savedNotification;
  }

  async findByUser(userId: string, page = 1, limit = 20): Promise<Notification[]> {
    const notifications = await this.notificationRepository.find({
      where: { recipientId: userId },
      order: { createdAt: 'DESC' },
      take: limit,
      skip: (page - 1) * limit,
    });

    if (notifications.length === 0) {
      return [];
    }

    const senderIds = Array.from(new Set(notifications.map((item) => item.senderId)));
    const users = await this.userRepository.find({ where: { id: In(senderIds) } });
    const senderMap = new Map(users.map((user) => [user.id, user]));

    return notifications.map((notification) => ({
      ...notification,
      sender: senderMap.get(notification.senderId),
    }));
  }

  async markAsRead(notificationId: string): Promise<void> {
    await this.notificationRepository.update(notificationId, { isRead: true });
  }

  async markAllAsRead(userId: string): Promise<void> {
    await this.notificationRepository.update(
      { recipientId: userId, isRead: false },
      { isRead: true },
    );
  }

  async getUnreadCount(userId: string): Promise<number> {
    return this.notificationRepository.count({
      where: { recipientId: userId, isRead: false },
    });
  }

  async createLikeNotification(likerId: string, postAuthorId: string, postId: string): Promise<Notification | null> {
    return this.create(postAuthorId, likerId, 'LIKE', { postId });
  }

  async createCommentNotification(
    commenterId: string,
    postAuthorId: string,
    postId: string,
    commentId: string,
  ): Promise<Notification | null> {
    return this.create(postAuthorId, commenterId, 'COMMENT', { postId, commentId });
  }

  async createFollowNotification(followerId: string, followingId: string): Promise<Notification | null> {
    return this.create(followingId, followerId, 'FOLLOW');
  }

  async createPostTagNotification(
    taggerId: string,
    taggedUserId: string,
    postId: string,
  ): Promise<Notification | null> {
    return this.create(taggedUserId, taggerId, 'POST_TAG', { postId });
  }

  async createCommentLikeNotification(
    likerId: string,
    commentAuthorId: string,
    postId: string,
    commentId: string,
    parentId?: string,
  ): Promise<Notification | null> {
    return this.create(commentAuthorId, likerId, 'COMMENT_LIKE', { postId, commentId, parentId });
  }

  async createReplyNotification(
    replierId: string,
    parentCommentAuthorId: string,
    postId: string,
    commentId: string,
    parentId: string,
  ): Promise<Notification | null> {
    return this.create(parentCommentAuthorId, replierId, 'COMMENT', {
      postId,
      commentId,
      parentId,
      kind: 'reply',
    });
  }
}
