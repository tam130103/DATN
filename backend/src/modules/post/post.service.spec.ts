import { BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DataSource, EntityManager, Repository } from 'typeorm';
import { AIService } from '../ai/ai.service';
import { Comment } from '../engagement/entities/comment.entity';
import { Like } from '../engagement/entities/like.entity';
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
    createQueryBuilder: jest.fn(),
  }) as unknown as jest.Mocked<Repository<T>>;

describe('PostService.create', () => {
  let service: PostService;
  let postRepository: jest.Mocked<Repository<Post>>;
  let mediaRepository: jest.Mocked<Repository<Media>>;
  let hashtagRepository: jest.Mocked<Repository<Hashtag>>;
  let postHashtagRepository: jest.Mocked<Repository<PostHashtag>>;
  let postMentionRepository: jest.Mocked<Repository<PostMention>>;
  let followRepository: jest.Mocked<Repository<Follow>>;
  let userRepository: jest.Mocked<Repository<User>>;
  let likeRepository: jest.Mocked<Repository<Like>>;
  let commentRepository: jest.Mocked<Repository<Comment>>;
  let dataSource: jest.Mocked<DataSource>;
  let aiService: jest.Mocked<AIService>;
  let manager: jest.Mocked<EntityManager>;

  beforeEach(() => {
    postRepository = createRepositoryMock<Post>();
    mediaRepository = createRepositoryMock<Media>();
    hashtagRepository = createRepositoryMock<Hashtag>();
    postHashtagRepository = createRepositoryMock<PostHashtag>();
    postMentionRepository = createRepositoryMock<PostMention>();
    followRepository = createRepositoryMock<Follow>();
    userRepository = createRepositoryMock<User>();
    likeRepository = createRepositoryMock<Like>();
    commentRepository = createRepositoryMock<Comment>();

    manager = {
      create: jest.fn((_entity, payload) => payload),
      save: jest.fn(async (payload) => ({
        id: 'post-1',
        createdAt: new Date('2026-03-25T00:00:00.000Z'),
        ...payload,
      })),
    } as unknown as jest.Mocked<EntityManager>;

    dataSource = {
      transaction: jest.fn(async (callback: (manager: EntityManager) => Promise<unknown>) => callback(manager)),
    } as unknown as jest.Mocked<DataSource>;

    aiService = {
      moderateContent: jest.fn(),
      detectSentiment: jest.fn(),
    } as unknown as jest.Mocked<AIService>;

    service = new PostService(
      postRepository,
      mediaRepository,
      hashtagRepository,
      postHashtagRepository,
      postMentionRepository,
      followRepository,
      userRepository,
      likeRepository,
      commentRepository,
      dataSource,
      { get: jest.fn() } as unknown as ConfigService,
      aiService,
    );

    jest.spyOn(service as any, 'processMedia').mockResolvedValue(undefined);
    jest.spyOn(service as any, 'processHashtags').mockResolvedValue(undefined);
    jest.spyOn(service as any, 'processMentions').mockResolvedValue(undefined);
    jest.spyOn(service, 'enrichPosts').mockImplementation(async (posts) => posts);
  });

  it('blocks toxic content and never starts a transaction', async () => {
    aiService.moderateContent.mockResolvedValue({
      isSafe: false,
      reason: 'Có dấu hiệu quấy rối',
    });

    await expect(service.create('user-1', { caption: 'toxic', media: [] })).rejects.toThrow(
      BadRequestException,
    );

    expect(aiService.moderateContent).toHaveBeenCalledWith('toxic');
    expect(aiService.detectSentiment).not.toHaveBeenCalled();
    expect(dataSource.transaction).not.toHaveBeenCalled();
  });

  it('creates a post after moderation passes and keeps trimmed caption', async () => {
    aiService.moderateContent.mockResolvedValue({ isSafe: true });
    aiService.detectSentiment.mockResolvedValue({
      label: 'positive',
      score: 0.88,
      summary: 'Tích cực',
    });

    const result = await service.create('user-1', {
      caption: '  Bài viết an toàn #tag @friend  ',
      media: [],
    });

    expect(aiService.moderateContent).toHaveBeenCalledWith('Bài viết an toàn #tag @friend');
    expect(aiService.detectSentiment).toHaveBeenCalledWith('Bài viết an toàn #tag @friend');
    expect(manager.create).toHaveBeenCalledWith(Post, {
      userId: 'user-1',
      caption: 'Bài viết an toàn #tag @friend',
    });
    expect((service as any).processHashtags).toHaveBeenCalledWith(
      manager,
      'post-1',
      'Bài viết an toàn #tag @friend',
    );
    expect((service as any).processMentions).toHaveBeenCalledWith(
      manager,
      'post-1',
      'Bài viết an toàn #tag @friend',
    );
    expect(result).toMatchObject({
      id: 'post-1',
      userId: 'user-1',
      caption: 'Bài viết an toàn #tag @friend',
    });
  });
});
