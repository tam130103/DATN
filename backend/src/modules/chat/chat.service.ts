import {
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, In, Repository } from 'typeorm';
import { AIService } from '../ai/ai.service';
import { User } from '../user/entities/user.entity';
import { UserService } from '../user/user.service';
import { CreateConversationDto } from './dto/create-conversation.dto';
import { ConversationMember } from './entities/conversation-member.entity';
import { Conversation } from './entities/conversation.entity';
import { Message } from './entities/message.entity';
import { assertAllowedCloudinaryUrl } from '../../common/media-validation.util';

@Injectable()
export class ChatService {
  private readonly logger = new Logger(ChatService.name);

  constructor(
    @InjectRepository(Conversation)
    private readonly conversationRepository: Repository<Conversation>,
    @InjectRepository(ConversationMember)
    private readonly memberRepository: Repository<ConversationMember>,
    @InjectRepository(Message)
    private readonly messageRepository: Repository<Message>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly dataSource: DataSource,
    private readonly aiService: AIService,
    private readonly userService: UserService,
  ) {}

  async findOrCreateConversation(
    userId: string,
    otherUserId: string,
  ): Promise<Conversation> {
    const existing = await this.conversationRepository
      .createQueryBuilder('conversation')
      .leftJoinAndSelect('conversation.members', 'member')
      .where('conversation.isGroup = :isGroup', { isGroup: false })
      .andWhere(
        `(
          SELECT COUNT(*)
          FROM conversation_members cm
          WHERE cm."conversationId" = conversation.id
          AND cm."hasLeft" = false
          AND cm."userId" IN (:...userIds)
        ) = 2`,
        { userIds: [userId, otherUserId] },
      )
      .getOne();

    if (existing) {
      return existing;
    }

    const conversationId = await this.dataSource.transaction(async (manager) => {
      const conversation = manager.create(Conversation, {
        isGroup: false,
      });
      const savedConv = await manager.save(conversation);

      const members = [
        manager.create(ConversationMember, {
          conversationId: savedConv.id,
          userId,
        }),
        manager.create(ConversationMember, {
          conversationId: savedConv.id,
          userId: otherUserId,
        }),
      ];
      await manager.save(members);

      return savedConv.id;
    });

    return this.findById(conversationId);
  }

  // ─── Phase 2: AI Chatbot Companion ────────────────────────────────

  /** Find or create a 1-1 conversation between user and the AI bot */
  async getAssistantConversation(userId: string): Promise<Conversation> {
    const botUserId = await this.userService.getAssistantBotUserId();
    return this.findOrCreateConversation(userId, botUserId);
  }

  async createGroupConversation(
    userId: string,
    dto: CreateConversationDto,
  ): Promise<Conversation> {
    const conversationId = await this.dataSource.transaction(async (manager) => {
      const participantIds = Array.from(new Set([userId, ...dto.participantIds]));
      const conversation = manager.create(Conversation, {
        isGroup: true,
        name: dto.name,
      });
      const savedConv = await manager.save(conversation);

      const members = participantIds.map((participantId) =>
        manager.create(ConversationMember, {
          conversationId: savedConv.id,
          userId: participantId,
        }),
      );
      await manager.save(members);

      return savedConv.id;
    });

    return this.findById(conversationId);
  }

  async getConversations(userId: string): Promise<any[]> {
    const memberships = await this.memberRepository.find({
      where: { userId, hasLeft: false },
    });

    if (memberships.length === 0) {
      return [];
    }

    const conversationIds = Array.from(
      new Set(memberships.map((member) => member.conversationId)),
    );
    const conversations = await this.conversationRepository.find({
      where: { id: In(conversationIds) },
      order: { updatedAt: 'DESC' },
    });

    const members = await this.memberRepository.find({
      where: { conversationId: In(conversationIds), hasLeft: false },
    });

    const userIds = Array.from(new Set(members.map((member) => member.userId)));
    const users = await this.userRepository.find({ where: { id: In(userIds) } });
    const usersById = new Map(users.map((user) => [user.id, user]));

    const membersByConversation = new Map<string, ConversationMember[]>();
    members.forEach((member) => {
      const existing = membersByConversation.get(member.conversationId) ?? [];
      existing.push(member);
      membersByConversation.set(member.conversationId, existing);
    });

    return Promise.all(
      conversations.map(async (conv) => {
        const lastMessage = await this.messageRepository.findOne({
          where: { conversationId: conv.id },
          order: { createdAt: 'DESC' },
        });

        const convMembers = membersByConversation.get(conv.id) ?? [];
        const otherMembers = convMembers.filter((member) => member.userId !== userId);

        return {
          id: conv.id,
          isGroup: conv.isGroup,
          name: conv.name,
          createdAt: conv.createdAt,
          updatedAt: conv.updatedAt,
          lastMessage,
          members: otherMembers.map((member) => ({
            id: usersById.get(member.userId)?.id ?? member.userId,
            username: usersById.get(member.userId)?.username ?? null,
            name: usersById.get(member.userId)?.name ?? null,
            avatarUrl: usersById.get(member.userId)?.avatarUrl ?? null,
          })),
        };
      }),
    );
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
    const isMember = await this.isMember(conversationId, senderId);
    if (!isMember) {
      throw new ForbiddenException('You are not a member of this conversation');
    }
    if (mediaUrl) {
      assertAllowedCloudinaryUrl(mediaUrl, 'media URL');
    }

    const savedId = await this.dataSource.transaction(async (manager) => {
      const message = manager.create(Message, {
        conversationId,
        senderId,
        content,
        mediaUrl,
      });
      const saved = await manager.save(message);

      await manager.update(
        Conversation,
        { id: conversationId },
        { updatedAt: new Date() },
      );

      return saved.id;
    });

    return this.messageRepository.findOneOrFail({
      where: { id: savedId },
      relations: ['sender'],
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
    const isMember = await this.isMember(conversationId, userId);
    if (!isMember) {
      throw new ForbiddenException('You are not a member of this conversation');
    }

    await this.messageRepository
      .createQueryBuilder()
      .update(Message)
      .set({ isRead: true })
      .where('conversationId = :conversationId', { conversationId })
      .andWhere('senderId != :userId', { userId })
      .andWhere('isRead = false')
      .execute();
  }

  async getUnreadCount(userId: string): Promise<number> {
    return this.messageRepository
      .createQueryBuilder('message')
      .innerJoin(
        'conversation_members',
        'cm',
        'cm."conversationId" = message."conversationId" AND cm."userId" = :userId AND cm."hasLeft" = false',
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

  // ─── Phase 2: AI auto-reply logic ────────────────────────────────

  /**
   * If this conversation includes the AI bot, call Dify and create a reply message.
   * Returns the reply Message, or null if not applicable.
   */
  async sendAssistantReplyIfNeeded(
    conversationId: string,
    senderId: string,
    content: string,
  ): Promise<Message | null> {
    const trimmed = content?.trim();
    if (!trimmed) return null;

    // Don't reply to ourselves
    const botUserId = await this.userService.getAssistantBotUserId();
    if (senderId === botUserId) return null;

    // Check if the AI bot is a member of this conversation
    const conversation = await this.conversationRepository.findOne({
      where: { id: conversationId },
      relations: ['members'],
    });
    if (!conversation) return null;

    const botIsMember = conversation.members.some(
      (m) => m.userId === botUserId && !m.hasLeft,
    );
    if (!botIsMember) return null;

    try {
      let aiResult: { answer: string; conversationId: string | null };
      try {
        // First attempt: use stored difyConversationId for memory continuity
        aiResult = await this.aiService.chatWithAssistant(
          trimmed,
          conversation.difyConversationId,
          `conv:${conversationId}`,
        );
      } catch (firstErr: any) {
        // If Dify says the conversation_id no longer exists, clear it and retry fresh
        if (
          firstErr?.status === 404 ||
          firstErr?.message === 'DIFY_CONVERSATION_NOT_FOUND'
        ) {
          this.logger.warn(
            `[ChatService] Stale difyConversationId on conv ${conversationId} — clearing and retrying fresh`,
          );
          await this.conversationRepository.update(conversationId, {
            difyConversationId: null as any,
          });
          // Retry without the stale id — this starts a new Dify conversation
          aiResult = await this.aiService.chatWithAssistant(
            trimmed,
            null,
            `conv:${conversationId}`,
          );
        } else {
          throw firstErr;
        }
      }

      // Always persist Dify's conversation_id so memory is maintained correctly
      if (aiResult.conversationId) {
        await this.conversationRepository.update(conversationId, {
          difyConversationId: aiResult.conversationId,
        });
      }

      // Save the bot's reply as a regular message
      return this.createMessage(conversationId, botUserId, aiResult.answer);
    } catch (err: any) {
      this.logger.warn(`AI reply failed (conv ${conversationId}): ${err?.message}`);
      return this.createMessage(
        conversationId,
        botUserId,
        'Trợ lý AI tạm thời chưa thể phản hồi. Bạn thử lại sau nhé 🙏',
      );
    }
  }
}
