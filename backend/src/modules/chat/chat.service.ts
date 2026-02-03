import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { Conversation } from './entities/conversation.entity';
import { ConversationMember } from './entities/conversation-member.entity';
import { Message } from './entities/message.entity';
import { CreateConversationDto } from './dto/create-conversation.dto';

@Injectable()
export class ChatService {
  constructor(
    @InjectRepository(Conversation)
    private readonly conversationRepository: Repository<Conversation>,
    @InjectRepository(ConversationMember)
    private readonly memberRepository: Repository<ConversationMember>,
    @InjectRepository(Message)
    private readonly messageRepository: Repository<Message>,
    private readonly dataSource: DataSource,
  ) {}

  async findOrCreateConversation(
    userId: string,
    otherUserId: string,
  ): Promise<Conversation> {
    // Find existing 1-1 conversation
    const existing = await this.conversationRepository
      .createQueryBuilder('conversation')
      .leftJoinAndSelect('conversation.members', 'member')
      .where('conversation.isGroup = :isGroup', { isGroup: false })
      .andWhere(
        `(
          SELECT COUNT(*)
          FROM conversation_members cm
          WHERE cm.conversation_id = conversation.id
          AND cm.has_left = false
          AND cm.user_id IN (:...userIds)
        ) = 2`,
        { userIds: [userId, otherUserId] },
      )
      .getOne();

    if (existing) return existing;

    // Create new conversation
    return this.dataSource.transaction(async (manager) => {
      const conversation = manager.create(Conversation, {
        isGroup: false,
      });
      const savedConv = await manager.save(conversation);

      const members = [
        manager.create(ConversationMember, { conversationId: savedConv.id, userId }),
        manager.create(ConversationMember, { conversationId: savedConv.id, userId: otherUserId }),
      ];
      await manager.save(members);

      return this.findById(savedConv.id);
    });
  }

  async createGroupConversation(
    userId: string,
    dto: CreateConversationDto,
  ): Promise<Conversation> {
    return this.dataSource.transaction(async (manager) => {
      const conversation = manager.create(Conversation, {
        isGroup: true,
        name: dto.name,
      });
      const savedConv = await manager.save(conversation);

      const members = dto.participantIds.map((participantId) =>
        manager.create(ConversationMember, {
          conversationId: savedConv.id,
          userId: participantId,
        }),
      );
      await manager.save(members);

      return this.findById(savedConv.id);
    });
  }

  async getConversations(userId: string): Promise<any[]> {
    const conversations = await this.conversationRepository
      .createQueryBuilder('conversation')
      .leftJoinAndSelect('conversation.members', 'member')
      .leftJoinAndSelect('member.user', 'user')
      .innerJoin(
        'conversation.members',
        'myMember',
        'myMember.userId = :userId AND myMember.hasLeft = false',
        { userId },
      )
      .orderBy('conversation.updatedAt', 'DESC')
      .getMany();

    // Get last message for each conversation
    const result = await Promise.all(
      conversations.map(async (conv) => {
        const lastMessage = await this.messageRepository.findOne({
          where: { conversationId: conv.id },
          order: { createdAt: 'DESC' },
        });

        const otherMembers = conv.members.filter((m) => m.userId !== userId && !m.hasLeft);

        return {
          id: conv.id,
          isGroup: conv.isGroup,
          name: conv.name,
          createdAt: conv.createdAt,
          updatedAt: conv.updatedAt,
          lastMessage,
          members: otherMembers.map((m) => ({
            id: m.user.id,
            username: m.user.username,
            name: m.user.name,
            avatarUrl: m.user.avatarUrl,
          })),
        };
      }),
    );

    return result;
  }

  async findById(id: string): Promise<Conversation> {
    const conversation = await this.conversationRepository.findOne({
      where: { id },
      relations: ['members', 'members.user'],
    });
    if (!conversation) {
      throw new NotFoundException('Conversation not found');
    }
    return conversation;
  }

  async isMember(conversationId: string, userId: string): Promise<boolean> {
    const member = await this.memberRepository.findOne({
      where: { conversationId, userId, hasLeft: false },
    });
    return !!member;
  }

  async createMessage(
    conversationId: string,
    senderId: string,
    content: string,
    mediaUrl?: string,
  ): Promise<Message> {
    // Verify user is member
    const isMember = await this.isMember(conversationId, senderId);
    if (!isMember) {
      throw new ForbiddenException('You are not a member of this conversation');
    }

    return this.dataSource.transaction(async (manager) => {
      const message = manager.create(Message, {
        conversationId,
        senderId,
        content,
        mediaUrl,
      });
      const saved = await manager.save(message);

      // Update conversation's updatedAt
      await manager.update(
        Conversation,
        { id: conversationId },
        { updatedAt: new Date() },
      );

      return this.findById(saved.id).then(() => saved);
    });
  }

  async getMessages(
    conversationId: string,
    userId: string,
    page = 1,
    limit = 50,
  ): Promise<Message[]> {
    const isMember = await this.isMember(conversationId, userId);
    if (!isMember) {
      throw new ForbiddenException('You are not a member of this conversation');
    }

    return this.messageRepository.find({
      where: { conversationId },
      relations: ['sender'],
      order: { createdAt: 'DESC' },
      take: limit,
      skip: (page - 1) * limit,
    });
  }

  async markAsRead(conversationId: string, userId: string): Promise<void> {
    await this.messageRepository.update(
      {
        conversationId,
        senderId: userId,
      },
      { isRead: true },
    );
  }

  async getUnreadCount(userId: string): Promise<number> {
    return this.messageRepository
      .createQueryBuilder('message')
      .innerJoin(
        'conversation_members',
        'cm',
        'cm.conversation_id = message.conversation_id AND cm.user_id = :userId AND cm.has_left = false',
        { userId },
      )
      .where('message.senderId != :userId', { userId })
      .andWhere('message.isRead = false')
      .getCount();
  }

  async leaveConversation(conversationId: string, userId: string): Promise<void> {
    const member = await this.memberRepository.findOne({
      where: { conversationId, userId },
    });

    if (!member) {
      throw new NotFoundException('You are not a member of this conversation');
    }

    member.hasLeft = true;
    await this.memberRepository.save(member);
  }
}
