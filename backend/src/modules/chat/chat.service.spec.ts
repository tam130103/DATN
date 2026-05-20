import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { DataSource, EntityManager, Repository } from 'typeorm';
import { AIService } from '../ai/ai.service';
import { User, UserStatus } from '../user/entities/user.entity';
import { UserService } from '../user/user.service';
import { ChatService } from './chat.service';
import { ConversationMember } from './entities/conversation-member.entity';
import { Conversation } from './entities/conversation.entity';
import { Message } from './entities/message.entity';

const createRepositoryMock = <T>() =>
  ({
    find: jest.fn(),
    findOne: jest.fn(),
    findOneOrFail: jest.fn(),
    update: jest.fn(),
    createQueryBuilder: jest.fn(),
  }) as unknown as jest.Mocked<Repository<T>>;

const createServiceSetup = () => {
  const conversationRepository = createRepositoryMock<Conversation>();
  const memberRepository = createRepositoryMock<ConversationMember>();
  const messageRepository = createRepositoryMock<Message>();
  const userRepository = createRepositoryMock<User>();
  const directConversationQuery = {
    leftJoinAndSelect: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    getOne: jest.fn().mockResolvedValue(null),
  };

  conversationRepository.createQueryBuilder.mockReturnValue(directConversationQuery as any);

  const manager = {
    create: jest.fn((_entity, payload) => payload),
    save: jest.fn(async (payload) => ({ id: 'saved-id', ...payload })),
    update: jest.fn().mockResolvedValue(undefined),
  } as unknown as jest.Mocked<EntityManager>;

  const dataSource = {
    transaction: jest.fn(
      async (callback: (entityManager: EntityManager) => Promise<unknown>) => callback(manager),
    ),
  } as unknown as jest.Mocked<DataSource>;

  const userService = {
    getAssistantBotUserId: jest.fn(),
  } as unknown as jest.Mocked<UserService>;

  const aiService = {
    chatWithAssistant: jest.fn(),
  } as unknown as jest.Mocked<AIService>;

  const service = new ChatService(
    conversationRepository,
    memberRepository,
    messageRepository,
    userRepository,
    dataSource,
    aiService,
    userService,
  );

  return {
    service,
    conversationRepository,
    memberRepository,
    messageRepository,
    userRepository,
    dataSource,
    manager,
    directConversationQuery,
    aiService,
    userService,
  };
};

const activeUser = (id: string): User =>
  ({
    id,
    status: UserStatus.ACTIVE,
    username: id,
  }) as User;

describe('ChatService.findOrCreateConversation', () => {
  it('rejects direct conversations with yourself', async () => {
    const { service, dataSource } = createServiceSetup();

    await expect(service.findOrCreateConversation('user-1', 'user-1')).rejects.toThrow(
      BadRequestException,
    );
    expect(dataSource.transaction).not.toHaveBeenCalled();
  });

  it('rejects direct conversations with missing participants', async () => {
    const { service, userRepository, dataSource } = createServiceSetup();

    userRepository.find.mockResolvedValue([activeUser('user-1')]);

    await expect(service.findOrCreateConversation('user-1', 'missing-user')).rejects.toThrow(
      NotFoundException,
    );
    expect(dataSource.transaction).not.toHaveBeenCalled();
  });
});

describe('ChatService.createMessage', () => {
  it('rejects blank messages before saving', async () => {
    const { service, memberRepository, dataSource } = createServiceSetup();

    memberRepository.findOne.mockResolvedValue({ id: 'member-1' } as ConversationMember);

    await expect(service.createMessage('conv-1', 'user-1', '   ')).rejects.toThrow(
      BadRequestException,
    );
    expect(dataSource.transaction).not.toHaveBeenCalled();
  });

  it('still rejects non-members', async () => {
    const { service } = createServiceSetup();

    await expect(service.createMessage('conv-1', 'user-1', 'hello')).rejects.toThrow(
      ForbiddenException,
    );
  });
});

describe('ChatService.sendAssistantReplyIfNeeded', () => {
  it('clears stale difyConversationId with null and retries when Dify returns 404', async () => {
    const {
      service,
      conversationRepository,
      aiService,
      userService,
      messageRepository,
      memberRepository,
    } = createServiceSetup();

    userService.getAssistantBotUserId.mockResolvedValue('bot-1');
    conversationRepository.findOne.mockResolvedValue({
      id: 'conv-1',
      difyConversationId: 'stale-id',
      members: [{ userId: 'bot-1', hasLeft: false }],
    } as any);

    aiService.chatWithAssistant
      .mockRejectedValueOnce({ status: 404 }) // Stale ID error
      .mockResolvedValueOnce({ answer: 'fresh reply', conversationId: 'new-id' });

    memberRepository.findOne.mockResolvedValue({
      id: 'member-bot',
      userId: 'bot-1',
    } as any);

    messageRepository.findOneOrFail.mockResolvedValue({
      id: 'msg-reply',
      content: 'fresh reply',
    } as any);

    const reply = await service.sendAssistantReplyIfNeeded('conv-1', 'user-1', 'hello');

    expect(conversationRepository.update).toHaveBeenCalledWith('conv-1', {
      difyConversationId: null,
    });
    expect(aiService.chatWithAssistant).toHaveBeenCalledTimes(2);
    expect(aiService.chatWithAssistant.mock.calls[0][1]).toBe('stale-id');
    expect(aiService.chatWithAssistant.mock.calls[1][1]).toBeNull();
    expect(reply?.content).toBe('fresh reply');
  });
});
