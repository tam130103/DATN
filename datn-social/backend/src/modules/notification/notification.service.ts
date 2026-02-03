import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Notification, NotificationType } from './entities/notification.entity';
import { User } from '../user/entities/user.entity';
import { UserService } from '../user/user.service';

@Injectable()
export class NotificationService {
  constructor(
    @InjectRepository(Notification)
    private readonly notificationRepository: Repository<Notification>,
    private readonly userService: UserService,
  ) {}

  async create(
    recipientId: string,
    senderId: string,
    type: NotificationType,
    data?: Record<string, any>,
  ): Promise<Notification | null> {
    // Don't notify yourself
    if (recipientId === senderId) {
      return null;
    }

    // Check if recipient has notifications enabled
    const recipient = await this.userService.findById(recipientId);
    if (!recipient.notificationEnabled) {
      return null;
    }

    const notification = this.notificationRepository.create({
      recipientId,
      senderId,
      type,
      data,
    });
    return this.notificationRepository.save(notification);
  }

  async findByUser(userId: string, page = 1, limit = 20): Promise<Notification[]> {
    return this.notificationRepository.find({
      where: { recipientId: userId },
      relations: ['sender'],
      order: { createdAt: 'DESC' },
      take: limit,
      skip: (page - 1) * limit,
    });
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

  // Helper methods
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
}
