import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Repository, In } from 'typeorm';
import { Like } from './entities/like.entity';
import { Comment, CommentStatus } from './entities/comment.entity';
import { CommentLike } from './entities/comment-like.entity';
import { SavedPost } from './entities/saved-post.entity';
import { Follow } from '../user/entities/follow.entity';
import { NotificationService } from '../notification/notification.service';
import { NotificationGateway } from '../notification/notification.gateway';
import { Post, PostStatus } from '../post/entities/post.entity';
import { EngagementService } from './engagement.service';

const createRepositoryMock = <T>() =>
  ({
    find: jest.fn(),
    findOne: jest.fn(),
    create: jest.fn((payload) => payload),
    save: jest.fn(async (payload) => ({ id: `generated-${Date.now()}`, ...payload })),
    remove: jest.fn(),
    count: jest.fn(),
    createQueryBuilder: jest.fn(),
  }) as unknown as jest.Mocked<Repository<T>>;

const createQueryBuilderChain = (rawResult: any[] = []) => {
  const chain = {
    select: jest.fn().mockReturnThis(),
    addSelect: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    groupBy: jest.fn().mockReturnThis(),
    getRawMany: jest.fn().mockResolvedValue(rawResult),
  };
  return chain;
};

const createServiceSetup = () => {
  const likeRepository = createRepositoryMock<Like>();
  const commentRepository = createRepositoryMock<Comment>();
  const commentLikeRepository = createRepositoryMock<CommentLike>();
  const savedPostRepository = createRepositoryMock<SavedPost>();
  const postRepository = createRepositoryMock<Post>();
  const followRepository = createRepositoryMock<Follow>();

  const notificationService = {
    createLikeNotification: jest.fn(),
    createCommentNotification: jest.fn(),
    createCommentLikeNotification: jest.fn(),
    createReplyNotification: jest.fn(),
    createPostTagNotification: jest.fn(),
  } as unknown as jest.Mocked<NotificationService>;

  const notificationGateway = {
    emitToUser: jest.fn(),
  } as unknown as jest.Mocked<NotificationGateway>;

  const service = new EngagementService(
    likeRepository,
    commentRepository,
    commentLikeRepository,
    savedPostRepository,
    postRepository,
    followRepository,
    notificationService,
    notificationGateway,
  );

  return {
    service,
    likeRepository,
    commentRepository,
    commentLikeRepository,
    savedPostRepository,
    postRepository,
    followRepository,
    notificationService,
    notificationGateway,
  };
};

// ─── createComment: Reply validation ────────────────────────────────────

describe('EngagementService.createComment — Reply', () => {
  it('creates a root comment when no parentId is provided', async () => {
    const { service, postRepository, commentRepository, notificationService, notificationGateway } =
      createServiceSetup();

    postRepository.findOne.mockResolvedValue({
      id: 'post-1',
      userId: 'other-user',
    } as Post);

    commentRepository.create.mockImplementation((payload) => payload as any);
    commentRepository.save.mockResolvedValue({
      id: 'comment-1',
      userId: 'user-1',
      postId: 'post-1',
      content: 'Hello',
      parentId: null,
    } as any);

    notificationService.createCommentNotification.mockResolvedValue({
      id: 'notif-1',
    } as any);

    const result = await service.createComment('user-1', 'post-1', {
      content: 'Hello',
    });

    expect(result.id).toBe('comment-1');
    expect(commentRepository.create).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: 'user-1',
        postId: 'post-1',
        content: 'Hello',
        parentId: undefined,
      }),
    );
    expect(notificationService.createCommentNotification).toHaveBeenCalledWith(
      'user-1',
      'other-user',
      'post-1',
      'comment-1',
    );
    expect(notificationGateway.emitToUser).toHaveBeenCalledWith(
      'other-user',
      'notification',
      expect.objectContaining({ id: 'notif-1' }),
    );
  });

  it('creates a reply to a root comment and notifies the parent author', async () => {
    const { service, postRepository, commentRepository, notificationService, notificationGateway } =
      createServiceSetup();

    postRepository.findOne.mockResolvedValue({
      id: 'post-1',
      userId: 'post-owner',
    } as Post);

    // First findOne: validate parentId
    commentRepository.findOne
      .mockResolvedValueOnce({
        id: 'parent-1',
        postId: 'post-1',
        parentId: null,
        status: CommentStatus.VISIBLE,
        userId: 'parent-author',
      } as Comment)
      // Second findOne: fetch parent to send notification
      .mockResolvedValueOnce({
        id: 'parent-1',
        userId: 'parent-author',
      } as Comment);

    commentRepository.create.mockImplementation((p) => p as any);
    commentRepository.save.mockResolvedValue({
      id: 'reply-1',
      userId: 'user-1',
      postId: 'post-1',
      content: 'reply',
      parentId: 'parent-1',
    } as any);

    notificationService.createReplyNotification.mockResolvedValue({
      id: 'notif-reply-1',
    } as any);

    const result = await service.createComment('user-1', 'post-1', {
      content: 'reply',
      parentId: 'parent-1',
    });

    expect(result.parentId).toBe('parent-1');
    expect(notificationService.createReplyNotification).toHaveBeenCalledWith(
      'user-1',
      'parent-author',
      'post-1',
      'reply-1',
      'parent-1',
    );
    expect(notificationGateway.emitToUser).toHaveBeenCalledWith(
      'parent-author',
      'notification',
      expect.objectContaining({ id: 'notif-reply-1' }),
    );
    // Should NOT notify the post owner separately
    expect(notificationService.createCommentNotification).not.toHaveBeenCalled();
  });

  it('flattens nested replies to 1-level (reply to a reply → use grandparent)', async () => {
    const { service, postRepository, commentRepository } = createServiceSetup();

    postRepository.findOne.mockResolvedValue({
      id: 'post-1',
      userId: 'post-owner',
    } as Post);

    // First findOne: parent is itself a reply → has parentId
    commentRepository.findOne
      .mockResolvedValueOnce({
        id: 'reply-1',
        postId: 'post-1',
        parentId: 'root-comment',
        status: CommentStatus.VISIBLE,
        userId: 'reply-author',
      } as Comment)
      // Second findOne: fetch the root comment for notification
      .mockResolvedValueOnce({
        id: 'root-comment',
        userId: 'root-author',
      } as Comment);

    commentRepository.create.mockImplementation((p) => p as any);
    commentRepository.save.mockResolvedValue({
      id: 'reply-2',
      parentId: 'root-comment',
    } as any);

    await service.createComment('user-1', 'post-1', {
      content: 'nested reply',
      parentId: 'reply-1',
    });

    // Should flatten to root-comment, not reply-1
    expect(commentRepository.create).toHaveBeenCalledWith(
      expect.objectContaining({
        parentId: 'root-comment',
      }),
    );
  });

  it('throws BadRequestException when parent comment does not exist', async () => {
    const { service, postRepository, commentRepository } = createServiceSetup();

    postRepository.findOne.mockResolvedValue({
      id: 'post-1',
      userId: 'owner',
    } as Post);

    commentRepository.findOne.mockResolvedValue(null);

    await expect(
      service.createComment('user-1', 'post-1', {
        content: 'reply',
        parentId: 'nonexistent',
      }),
    ).rejects.toThrow(BadRequestException);
  });

  it('does not notify parent comment author when replying to own comment', async () => {
    const { service, postRepository, commentRepository, notificationService } = createServiceSetup();

    postRepository.findOne.mockResolvedValue({
      id: 'post-1',
      userId: 'post-owner',
    } as Post);

    commentRepository.findOne
      .mockResolvedValueOnce({
        id: 'parent-1',
        postId: 'post-1',
        parentId: null,
        status: CommentStatus.VISIBLE,
        userId: 'user-1', // same as commenter
      } as Comment)
      .mockResolvedValueOnce({
        id: 'parent-1',
        userId: 'user-1',
      } as Comment);

    commentRepository.create.mockImplementation((p) => p as any);
    commentRepository.save.mockResolvedValue({
      id: 'reply-1',
      parentId: 'parent-1',
      userId: 'user-1',
    } as any);

    notificationService.createReplyNotification.mockResolvedValue(null);

    await service.createComment('user-1', 'post-1', {
      content: 'self-reply',
      parentId: 'parent-1',
    });

    // The engagement service checks parentComment.userId !== userId
    // and skips createReplyNotification entirely when replying to own comment
    expect(notificationService.createReplyNotification).not.toHaveBeenCalled();
  });
});

// ─── getPostComments: aggregations ──────────────────────────────────────

describe('EngagementService.getPostComments — Aggregations', () => {
  it('returns comments with liked, likesCount, and repliesCount', async () => {
    const { service, commentRepository, commentLikeRepository, followRepository } =
      createServiceSetup();

    const comments = [
      {
        id: 'c1',
        userId: 'u1',
        user: { id: 'u1', isFollowing: false },
        postId: 'post-1',
        parentId: null,
        status: CommentStatus.VISIBLE,
      },
      {
        id: 'c2',
        userId: 'u2',
        user: { id: 'u2', isFollowing: false },
        postId: 'post-1',
        parentId: null,
        status: CommentStatus.VISIBLE,
      },
    ] as any[];

    commentRepository.find.mockResolvedValue(comments);
    followRepository.find.mockResolvedValue([]);

    // Comment likes counts
    const likesQB = createQueryBuilderChain([
      { commentId: 'c1', count: 3 },
      { commentId: 'c2', count: 0 },
    ]);
    commentLikeRepository.createQueryBuilder.mockReturnValue(likesQB as any);

    // Replies counts
    const repliesQB = createQueryBuilderChain([{ parentId: 'c1', count: 2 }]);
    commentRepository.createQueryBuilder.mockReturnValue(repliesQB as any);

    // User liked comments
    commentLikeRepository.find.mockResolvedValue([{ commentId: 'c1' }] as any);

    const result = await service.getPostComments('post-1', 'current-user');

    expect(result).toHaveLength(2);
    expect(result[0]).toMatchObject({
      id: 'c1',
      liked: true,
      likesCount: 3,
      repliesCount: 2,
    });
    expect(result[1]).toMatchObject({
      id: 'c2',
      liked: false,
      likesCount: 0,
      repliesCount: 0,
    });
  });

  it('returns empty array when no comments exist', async () => {
    const { service, commentRepository } = createServiceSetup();
    commentRepository.find.mockResolvedValue([]);

    const result = await service.getPostComments('post-1', 'user-1');
    expect(result).toEqual([]);
  });
});

// ─── getCommentReplies ──────────────────────────────────────────────────

describe('EngagementService.getCommentReplies', () => {
  it('returns replies sorted ASC with liked and likesCount', async () => {
    const { service, commentRepository, commentLikeRepository } = createServiceSetup();

    const replies = [
      { id: 'r1', userId: 'u1', user: { id: 'u1' }, parentId: 'c1' },
      { id: 'r2', userId: 'u2', user: { id: 'u2' }, parentId: 'c1' },
    ] as any[];

    commentRepository.find.mockResolvedValue(replies);

    const likesQB = createQueryBuilderChain([{ commentId: 'r1', count: 1 }]);
    commentLikeRepository.createQueryBuilder.mockReturnValue(likesQB as any);
    commentLikeRepository.find.mockResolvedValue([{ commentId: 'r2' }] as any);

    const result = await service.getCommentReplies('c1', 'current-user');

    expect(result).toHaveLength(2);
    expect(result[0]).toMatchObject({ id: 'r1', liked: false, likesCount: 1 });
    expect(result[1]).toMatchObject({ id: 'r2', liked: true, likesCount: 0 });
  });

  it('returns empty array when comment has no replies', async () => {
    const { service, commentRepository } = createServiceSetup();
    commentRepository.find.mockResolvedValue([]);

    const result = await service.getCommentReplies('c1', 'user-1');
    expect(result).toEqual([]);
  });
});

// ─── toggleCommentLike ──────────────────────────────────────────────────

describe('EngagementService.toggleCommentLike', () => {
  it('likes a comment and sends notification to comment author', async () => {
    const {
      service,
      commentRepository,
      commentLikeRepository,
      notificationService,
      notificationGateway,
    } = createServiceSetup();

    commentRepository.findOne.mockResolvedValue({
      id: 'c1',
      userId: 'comment-author',
      postId: 'post-1',
      status: CommentStatus.VISIBLE,
    } as any);

    commentLikeRepository.findOne.mockResolvedValue(null);
    commentLikeRepository.create.mockImplementation((p) => p as any);
    commentLikeRepository.save.mockResolvedValue({ id: 'cl-1' } as any);
    commentLikeRepository.count.mockResolvedValue(5);

    notificationService.createCommentLikeNotification.mockResolvedValue({
      id: 'notif-cl-1',
    } as any);

    const result = await service.toggleCommentLike('user-1', 'c1');

    expect(result).toEqual({ liked: true, likesCount: 5 });
    expect(commentLikeRepository.create).toHaveBeenCalledWith({
      userId: 'user-1',
      commentId: 'c1',
    });
    expect(notificationService.createCommentLikeNotification).toHaveBeenCalledWith(
      'user-1',
      'comment-author',
      'post-1',
      'c1',
    );
    expect(notificationGateway.emitToUser).toHaveBeenCalledWith(
      'comment-author',
      'notification',
      expect.objectContaining({ id: 'notif-cl-1' }),
    );
  });

  it('unlikes a comment when already liked', async () => {
    const { service, commentRepository, commentLikeRepository, notificationService } =
      createServiceSetup();

    commentRepository.findOne.mockResolvedValue({
      id: 'c1',
      userId: 'comment-author',
      postId: 'post-1',
      status: CommentStatus.VISIBLE,
    } as any);

    const existingLike = { id: 'cl-1', userId: 'user-1', commentId: 'c1' };
    commentLikeRepository.findOne.mockResolvedValue(existingLike as any);
    commentLikeRepository.count.mockResolvedValue(3);

    const result = await service.toggleCommentLike('user-1', 'c1');

    expect(result).toEqual({ liked: false, likesCount: 3 });
    expect(commentLikeRepository.remove).toHaveBeenCalledWith(existingLike);
    expect(notificationService.createCommentLikeNotification).not.toHaveBeenCalled();
  });

  it('throws NotFoundException when comment is hidden or deleted', async () => {
    const { service, commentRepository } = createServiceSetup();
    commentRepository.findOne.mockResolvedValue(null);

    await expect(service.toggleCommentLike('user-1', 'nonexistent')).rejects.toThrow(
      NotFoundException,
    );
  });

  it('does not notify when liking own comment', async () => {
    const { service, commentRepository, commentLikeRepository, notificationService } =
      createServiceSetup();

    commentRepository.findOne.mockResolvedValue({
      id: 'c1',
      userId: 'user-1', // same as liker
      postId: 'post-1',
      status: CommentStatus.VISIBLE,
    } as any);

    commentLikeRepository.findOne.mockResolvedValue(null);
    commentLikeRepository.create.mockImplementation((p) => p as any);
    commentLikeRepository.save.mockResolvedValue({ id: 'cl-1' } as any);
    commentLikeRepository.count.mockResolvedValue(1);

    const result = await service.toggleCommentLike('user-1', 'c1');

    expect(result).toEqual({ liked: true, likesCount: 1 });
    expect(notificationService.createCommentLikeNotification).not.toHaveBeenCalled();
  });
});

// ─── NotificationService helpers (unit) ─────────────────────────────────

describe('NotificationService notification helpers', () => {
  // These are already covered by the engagement tests above (via mocks).
  // Adding a quick test for createReplyNotification shape
  it('createReplyNotification receives correct data shape', async () => {
    const { service, postRepository, commentRepository, notificationService } = createServiceSetup();

    postRepository.findOne.mockResolvedValue({ id: 'post-1', userId: 'owner' } as Post);

    commentRepository.findOne
      .mockResolvedValueOnce({
        id: 'parent-1',
        postId: 'post-1',
        parentId: null,
        status: CommentStatus.VISIBLE,
        userId: 'parent-author',
      } as Comment)
      .mockResolvedValueOnce({ id: 'parent-1', userId: 'parent-author' } as Comment);

    commentRepository.create.mockImplementation((p) => p as any);
    commentRepository.save.mockResolvedValue({
      id: 'reply-new',
      parentId: 'parent-1',
    } as any);

    notificationService.createReplyNotification.mockResolvedValue({ id: 'n1' } as any);

    await service.createComment('user-1', 'post-1', {
      content: 'reply text',
      parentId: 'parent-1',
    });

    expect(notificationService.createReplyNotification).toHaveBeenCalledWith(
      'user-1',
      'parent-author',
      'post-1',
      'reply-new',
      'parent-1',
    );
  });
});
