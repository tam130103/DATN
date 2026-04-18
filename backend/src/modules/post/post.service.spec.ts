import { BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DataSource, EntityManager, Repository } from 'typeorm';
import { AIService } from '../ai/ai.service';
import { Comment } from '../engagement/entities/comment.entity';
import { Like } from '../engagement/entities/like.entity';
import { SavedPost } from '../engagement/entities/saved-post.entity';
import { NotificationService } from '../notification/notification.service';
import { NotificationGateway } from '../notification/notification.gateway';
import { Follow } from '../user/entities/follow.entity';
import { User } from '../user/entities/user.entity';
import { Hashtag } from './entities/hashtag.entity';
import { Media } from './entities/media.entity';
import { Post } from './entities/post.entity';
import { PostHashtag } from './entities/post-hashtag.entity';
import { PostMention } from './entities/post-mention.entity';
import { PostService } from './post.service';

const createRepositoryMock = <T>() =>
  ({
    find: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    createQueryBuilder: jest.fn(),
  }) as unknown as jest.Mocked<Repository<T>>;

const flushPromises = () => new Promise((resolve) => setImmediate(resolve));

const createQueryBuilderMock = () => ({
  update: jest.fn().mockReturnThis(),
  set: jest.fn().mockReturnThis(),
  whereInIds: jest.fn().mockReturnThis(),
  execute: jest.fn().mockResolvedValue(undefined),
});

const createUser = (id: string, username: string): User =>
  ({
    id,
    username,
    email: `${username}@example.com`,
    name: username,
    bio: null,
    avatarUrl: null,
    followersCount: 0,
    followingCount: 0,
    notificationEnabled: true,
    createdAt: new Date('2026-03-25T00:00:00.000Z') as unknown as string,
    role: 'user',
    status: 'active',
  }) as unknown as User;

const createServiceSetup = () => {
  const postRepository = createRepositoryMock<Post>();
  const mediaRepository = createRepositoryMock<Media>();
  const hashtagRepository = createRepositoryMock<Hashtag>();
  const postHashtagRepository = createRepositoryMock<PostHashtag>();
  const postMentionRepository = createRepositoryMock<PostMention>();
  const followRepository = createRepositoryMock<Follow>();
  const userRepository = createRepositoryMock<User>();
  const likeRepository = createRepositoryMock<Like>();
  const commentRepository = createRepositoryMock<Comment>();
  const savedPostRepository = createRepositoryMock<SavedPost>();

  const hashtagQueryBuilder = createQueryBuilderMock();

  const manager = {
    create: jest.fn((_entity, payload) => payload),
    save: jest.fn(async (payload) => {
      if (Array.isArray(payload)) {
        return payload;
      }

      return {
        id: 'post-1',
        createdAt: new Date('2026-03-25T00:00:00.000Z'),
        ...payload,
      };
    }),
    find: jest.fn().mockResolvedValue([]),
    update: jest.fn().mockResolvedValue(undefined),
    delete: jest.fn().mockResolvedValue(undefined),
    createQueryBuilder: jest.fn(() => hashtagQueryBuilder),
  } as unknown as jest.Mocked<EntityManager>;

  const dataSource = {
    transaction: jest.fn(
      async (callback: (entityManager: EntityManager) => Promise<unknown>) => callback(manager),
    ),
  } as unknown as jest.Mocked<DataSource>;

  const aiService = {
    moderateContent: jest.fn(),
    detectSentiment: jest.fn(),
  } as unknown as jest.Mocked<AIService>;

  const notificationService = {
    createPostTagNotification: jest.fn(),
  } as unknown as jest.Mocked<NotificationService>;

  const notificationGateway = {
    emitToUser: jest.fn(),
  } as unknown as jest.Mocked<NotificationGateway>;

  const service = new PostService(
    postRepository,
    mediaRepository,
    hashtagRepository,
    postHashtagRepository,
    postMentionRepository,
    followRepository,
    userRepository,
    likeRepository,
    commentRepository,
    savedPostRepository,
    dataSource,
    { get: jest.fn() } as unknown as ConfigService,
    aiService,
    notificationService,
    notificationGateway,
  );

  return {
    service,
    postRepository,
    manager,
    dataSource,
    aiService,
    notificationService,
    notificationGateway,
    hashtagQueryBuilder,
  };
};

describe('PostService.create', () => {
  it('blocks toxic content and never starts a transaction', async () => {
    const { service, dataSource, aiService } = createServiceSetup();

    aiService.moderateContent.mockResolvedValue({
      isSafe: false,
      reason: 'Co dau hieu quay roi',
    });

    await expect(service.create('user-1', { caption: 'toxic', media: [] })).rejects.toThrow(
      BadRequestException,
    );

    expect(aiService.moderateContent).toHaveBeenCalledWith('toxic');
    expect(aiService.detectSentiment).not.toHaveBeenCalled();
    expect(dataSource.transaction).not.toHaveBeenCalled();
  });

  it('creates a post after moderation passes and keeps trimmed caption', async () => {
    const { service, manager, aiService } = createServiceSetup();

    aiService.moderateContent.mockResolvedValue({ isSafe: true });
    aiService.detectSentiment.mockResolvedValue({
      label: 'positive',
      score: 0.88,
      summary: 'Tich cuc',
    });

    jest.spyOn(service as any, 'processMedia').mockResolvedValue(undefined);
    jest.spyOn(service as any, 'processHashtags').mockResolvedValue(undefined);
    jest.spyOn(service as any, 'processMentions').mockResolvedValue([]);
    jest.spyOn(service, 'enrichPosts').mockImplementation(async (posts) => posts);

    const result = await service.create('user-1', {
      caption: '  Bai viet an toan #tag @friend  ',
      media: [],
    });

    expect(aiService.moderateContent).toHaveBeenCalledWith('Bai viet an toan #tag @friend');
    expect(aiService.detectSentiment).toHaveBeenCalledWith('Bai viet an toan #tag @friend');
    expect(manager.create).toHaveBeenCalledWith(Post, {
      userId: 'user-1',
      caption: 'Bai viet an toan #tag @friend',
    });
    expect((service as any).processHashtags).toHaveBeenCalledWith(
      manager,
      'post-1',
      'Bai viet an toan #tag @friend',
    );
    expect((service as any).processMentions).toHaveBeenCalledWith(
      manager,
      'post-1',
      'Bai viet an toan #tag @friend',
      'user-1',
    );
    expect(result).toMatchObject({
      id: 'post-1',
      userId: 'user-1',
      caption: 'Bai viet an toan #tag @friend',
    });
  });

  it('sends tag notifications for new mentions on create and skips the author', async () => {
    const {
      service,
      aiService,
      notificationService,
      notificationGateway,
      manager,
    } = createServiceSetup();

    aiService.moderateContent.mockResolvedValue({ isSafe: true });
    aiService.detectSentiment.mockResolvedValue({
      label: 'positive',
      score: 0.88,
      summary: 'Tich cuc',
    });

    jest.spyOn(service as any, 'processMedia').mockResolvedValue(undefined);
    jest.spyOn(service as any, 'processHashtags').mockResolvedValue(undefined);
    jest.spyOn(service as any, 'processMentions').mockResolvedValue([
      createUser('user-2', 'friend'),
      createUser('user-1', 'author'),
    ]);
    jest.spyOn(service, 'enrichPosts').mockImplementation(async (posts) => posts);

    notificationService.createPostTagNotification.mockResolvedValue({
      id: 'notif-1',
    } as any);

    await service.create('user-1', { caption: 'hello @friend', media: [] });
    await flushPromises();

    expect(manager.create).toHaveBeenCalledWith(Post, {
      userId: 'user-1',
      caption: 'hello @friend',
    });
    expect(notificationService.createPostTagNotification).toHaveBeenCalledTimes(1);
    expect(notificationService.createPostTagNotification).toHaveBeenCalledWith(
      'user-1',
      'user-2',
      'post-1',
    );
    expect(notificationGateway.emitToUser).toHaveBeenCalledWith(
      'user-2',
      'notification',
      expect.objectContaining({ id: 'notif-1' }),
    );
  });
});

describe('PostService.processMentions', () => {
  it('keeps @all as a real username mention and expands @@followers as a broadcast command', async () => {
    const { service, manager } = createServiceSetup();

    const allUser = createUser('user-all', 'all');
    const followerUsers = [createUser('user-2', 'friend-1'), createUser('user-3', 'friend-2')];

    manager.find.mockImplementation(async (entity, options) => {
      if (entity === User && Array.isArray((options as any)?.where)) {
        return [allUser];
      }

      if (entity === Follow) {
        return [{ followerId: 'user-2' }, { followerId: 'user-3' }] as Follow[];
      }

      if (entity === User) {
        return followerUsers;
      }

      return [];
    });

    const result = await (service as any).processMentions(
      manager,
      'post-1',
      'hello @all and @@followers',
      'author-1',
    );

    expect(result.map((user: User) => user.id)).toEqual(['user-all', 'user-2', 'user-3']);
    expect(manager.save).toHaveBeenCalledWith([
      { postId: 'post-1', userId: 'user-all' },
      { postId: 'post-1', userId: 'user-2' },
      { postId: 'post-1', userId: 'user-3' },
    ]);
  });
});

describe('PostService.updateCaption', () => {
  it('notifies only newly added mentions when editing a caption', async () => {
    const {
      service,
      postRepository,
      manager,
      aiService,
      notificationService,
      notificationGateway,
    } = createServiceSetup();

    postRepository.findOne.mockResolvedValue({
      id: 'post-1',
      userId: 'user-1',
      caption: 'old caption',
    } as Post);

    aiService.moderateContent.mockResolvedValue({ isSafe: true });
    notificationService.createPostTagNotification.mockResolvedValue({
      id: 'notif-2',
    } as any);

    manager.find.mockImplementation(async (entity) => {
      if (entity === PostHashtag) {
        return [];
      }

      if (entity === PostMention) {
        return [{ userId: 'user-2' }] as PostMention[];
      }

      return [];
    });

    jest.spyOn(service as any, 'processHashtags').mockResolvedValue(undefined);
    jest.spyOn(service as any, 'processMentions').mockResolvedValue([
      createUser('user-2', 'existing'),
      createUser('user-3', 'newfriend'),
      createUser('user-1', 'author'),
    ]);
    jest.spyOn(service, 'findById').mockResolvedValue({ id: 'post-1' } as Post);

    await service.updateCaption('post-1', 'user-1', 'new caption @existing @newfriend');
    await flushPromises();

    expect(notificationService.createPostTagNotification).toHaveBeenCalledTimes(1);
    expect(notificationService.createPostTagNotification).toHaveBeenCalledWith(
      'user-1',
      'user-3',
      'post-1',
    );
    expect(notificationGateway.emitToUser).toHaveBeenCalledWith(
      'user-3',
      'notification',
      expect.objectContaining({ id: 'notif-2' }),
    );
  });

  it('does not send tag notifications when an edit adds no new mentions', async () => {
    const { service, postRepository, manager, aiService, notificationService } =
      createServiceSetup();

    postRepository.findOne.mockResolvedValue({
      id: 'post-1',
      userId: 'user-1',
      caption: 'old caption',
    } as Post);

    aiService.moderateContent.mockResolvedValue({ isSafe: true });

    manager.find.mockImplementation(async (entity) => {
      if (entity === PostHashtag) {
        return [];
      }

      if (entity === PostMention) {
        return [{ userId: 'user-2' }] as PostMention[];
      }

      return [];
    });

    jest.spyOn(service as any, 'processHashtags').mockResolvedValue(undefined);
    jest.spyOn(service as any, 'processMentions').mockResolvedValue([
      createUser('user-2', 'existing'),
    ]);
    jest.spyOn(service, 'findById').mockResolvedValue({ id: 'post-1' } as Post);

    await service.updateCaption('post-1', 'user-1', 'new caption @existing');
    await flushPromises();

    expect(notificationService.createPostTagNotification).not.toHaveBeenCalled();
  });
});
