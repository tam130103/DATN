import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource, In, EntityManager } from 'typeorm';
import axios from 'axios';
import { ConfigService } from '@nestjs/config';
import { Post, PostStatus } from './entities/post.entity';
import { Media, MediaType } from './entities/media.entity';
import { Hashtag } from './entities/hashtag.entity';
import { PostHashtag } from './entities/post-hashtag.entity';
import { PostMention } from './entities/post-mention.entity';
import { CreatePostDto } from './dto/create-post.dto';
import { Follow } from '../user/entities/follow.entity';
import { User } from '../user/entities/user.entity';
import { Like } from '../engagement/entities/like.entity';
import { Comment, CommentStatus } from '../engagement/entities/comment.entity';
import { SavedPost } from '../engagement/entities/saved-post.entity';
import { AIService } from '../ai/ai.service';
import { NotificationService } from '../notification/notification.service';
import { NotificationGateway } from '../notification/notification.gateway';
import { CloudinaryService } from '../cloudinary/cloudinary.service';

const FOLLOWER_MENTION_COMMAND_ALIASES = ['followers', 'tatca', 'moinguoi'] as const;

@Injectable()
export class PostService {
  private readonly logger = new Logger(PostService.name);
  private facebookFeedRefreshInFlight: Promise<void> | null = null;
  private lastFacebookFeedRefreshAt = 0;

  constructor(
    @InjectRepository(Post)
    private readonly postRepository: Repository<Post>,
    @InjectRepository(Media)
    private readonly mediaRepository: Repository<Media>,
    @InjectRepository(Hashtag)
    private readonly hashtagRepository: Repository<Hashtag>,
    @InjectRepository(PostHashtag)
    private readonly postHashtagRepository: Repository<PostHashtag>,
    @InjectRepository(PostMention)
    private readonly postMentionRepository: Repository<PostMention>,
    @InjectRepository(Follow)
    private readonly followRepository: Repository<Follow>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(Like)
    private readonly likeRepository: Repository<Like>,
    @InjectRepository(Comment)
    private readonly commentRepository: Repository<Comment>,
    @InjectRepository(SavedPost)
    private readonly savedPostRepository: Repository<SavedPost>,
    private readonly dataSource: DataSource,
    private readonly configService: ConfigService,
    private readonly aiService: AIService,
    private readonly notificationService: NotificationService,
    private readonly notificationGateway: NotificationGateway,
    private readonly cloudinaryService: CloudinaryService,
  ) {}

  private extractHashtags(caption: string): string[] {
    const regex = /#(\w+)/g;
    const hashtags = new Set<string>();
    let match: RegExpExecArray | null;

    while ((match = regex.exec(caption)) !== null) {
      hashtags.add(match[1].toLowerCase());
    }

    return Array.from(hashtags);
  }

  private extractMentions(caption: string): string[] {
    const regex = /(^|[^@\w])@([a-zA-Z0-9_.]+)/g;
    const mentions = new Set<string>();
    let match: RegExpExecArray | null;

    while ((match = regex.exec(caption)) !== null) {
      mentions.add(match[2].toLowerCase());
    }

    return Array.from(mentions);
  }

  private extractMentionCommands(caption: string): string[] {
    const regex = /(^|[^@\w])@@([a-zA-Z0-9_]+)/g;
    const commands = new Set<string>();
    let match: RegExpExecArray | null;

    while ((match = regex.exec(caption)) !== null) {
      commands.add(match[2].toLowerCase());
    }

    return Array.from(commands);
  }

  private async processMedia(
    manager: EntityManager,
    postId: string,
    mediaDto: Array<{ url: string; type: MediaType }>,
  ) {
    if (!mediaDto || mediaDto.length === 0) return;
    const mediaEntities = mediaDto.map((item, index) =>
      manager.create(Media, { postId, url: item.url, type: item.type, orderIndex: index }),
    );
    await manager.save(mediaEntities);
  }

  private async processHashtags(manager: EntityManager, postId: string, caption: string) {
    const hashtagNames = this.extractHashtags(caption || '');
    if (hashtagNames.length === 0) return;

    const existingTags = await manager.find(Hashtag, {
      where: hashtagNames.map((name) => ({ name })),
    });

    const existingNames = new Set(existingTags.map((t) => t.name));
    const newNames = hashtagNames.filter((name) => !existingNames.has(name));

    let newTags: Hashtag[] = [];
    if (newNames.length > 0) {
      const created = newNames.map((name) => manager.create(Hashtag, { name, count: 0 }));
      newTags = await manager.save(created);
    }

    const allTags = [...existingTags, ...newTags];

    if (allTags.length > 0) {
      await manager
        .createQueryBuilder()
        .update(Hashtag)
        .set({ count: () => '"count" + 1' })
        .whereInIds(allTags.map((t) => t.id))
        .execute();
    }

    const postHashtags = allTags.map((tag) => manager.create(PostHashtag, { postId, hashtagId: tag.id }));
    await manager.save(postHashtags);
  }

  private async processMentions(
    manager: EntityManager,
    postId: string,
    caption: string,
    authorId?: string,
  ): Promise<User[]> {
    const mentionUsernames = this.extractMentions(caption || '');
    const mentionCommands = this.extractMentionCommands(caption || '');
    const mentionedUsers = new Map<string, User>();

    // Lọc ra các user thường (không phải lệnh tag đặc biệt)
    if (mentionUsernames.length > 0) {
      const directMentions = await manager.find(User, {
        where: mentionUsernames.map((username) => ({ username })),
      });

      for (const user of directMentions) {
        mentionedUsers.set(user.id, user);
      }
    }

    // Nếu có lệnh tag tất cả followers
    if (
      authorId &&
      mentionCommands.some((command) =>
        FOLLOWER_MENTION_COMMAND_ALIASES.includes(
          command as (typeof FOLLOWER_MENTION_COMMAND_ALIASES)[number],
        ),
      )
    ) {
      const follows = await manager.find(Follow, { where: { followingId: authorId } });
      const followerIds = follows.map((follow) => follow.followerId);

      if (followerIds.length > 0) {
        const followers = await manager.find(User, { where: { id: In(followerIds) } });
        for (const user of followers) {
          mentionedUsers.set(user.id, user);
        }
      }
    }

    const resolvedUsers = Array.from(mentionedUsers.values());

    if (resolvedUsers.length > 0) {
      const mentions = resolvedUsers.map((user) =>
        manager.create(PostMention, { postId, userId: user.id }),
      );
      await manager.save(mentions);
    }

    return resolvedUsers;
  }

  private dispatchPostTagNotifications(authorId: string, postId: string, mentionedUsers: User[]) {
    const recipients = Array.from(
      new Map(
        mentionedUsers
          .filter((user): user is User => Boolean(user?.id) && user.id !== authorId)
          .map((user) => [user.id, user]),
      ).values(),
    );

    if (recipients.length === 0) {
      return;
    }

    void Promise.allSettled(
      recipients.map(async (taggedUser) => {
        const notification = await this.notificationService.createPostTagNotification(
          authorId,
          taggedUser.id,
          postId,
        );

        if (notification) {
          this.notificationGateway.emitToUser(taggedUser.id, 'notification', notification);
        }
      }),
    ).then((results) => {
      results.forEach((result, index) => {
        if (result.status === 'rejected') {
          const reason =
            result.reason instanceof Error ? result.reason.message : String(result.reason);
          this.logger.warn(
            `Failed to send tag notification to ${recipients[index].id}: ${reason}`,
          );
        }
      });
    });
  }

  private normalizeFacebookMedia(post: any): Array<{ url: string; type: MediaType }> {
    const media: Array<{ url: string; type: MediaType }> = [];
    const attachments = post?.attachments?.data ?? [];

    const pushMedia = (item: any) => {
      if (!item) return;
      const mediaType = (item.media_type || '').toLowerCase();
      const type = mediaType.includes('video') ? MediaType.VIDEO : MediaType.IMAGE;
      const url =
        item.media?.source ||
        item.media?.image?.src ||
        item.media?.image?.source ||
        item.media?.image?.url ||
        item.media?.image ||
        undefined;
      if (url) {
        media.push({ url, type });
      }
    };

    attachments.forEach((attachment: any) => {
      if (attachment?.subattachments?.data?.length) {
        attachment.subattachments.data.forEach(pushMedia);
      } else {
        pushMedia(attachment);
      }
    });

    if (media.length === 0 && post?.full_picture) {
      media.push({ url: post.full_picture, type: MediaType.IMAGE });
    }

    return media;
  }

  private getFacebookPostCreatedAt(post: any): Date | null {
    if (!post?.created_time) {
      return null;
    }

    const createdAt = new Date(post.created_time);
    return Number.isNaN(createdAt.getTime()) ? null : createdAt;
  }

  private async reconcileRemovedFacebookPosts(
    userId: string,
    fbPosts: any[],
    limit: number,
    hasMorePages: boolean,
  ): Promise<number> {
    if (!Array.isArray(fbPosts) || fbPosts.length === 0) {
      return 0;
    }

    const fetchedIds = fbPosts
      .map((post) => post?.id)
      .filter((id): id is string => typeof id === 'string' && id.length > 0);

    if (fetchedIds.length === 0) {
      return 0;
    }

    const fetchedDates = fbPosts
      .map((post) => this.getFacebookPostCreatedAt(post))
      .filter((date): date is Date => date instanceof Date);

    if (fetchedDates.length === 0) {
      return 0;
    }

    const oldestFetchedDate = fetchedDates.reduce((oldest, current) =>
      current.getTime() < oldest.getTime() ? current : oldest,
    );

    let query = this.postRepository
      .createQueryBuilder('post')
      .select(['post.id', 'post.sourceId'])
      .where('post.userId = :userId', { userId })
      .andWhere('post.source = :source', { source: 'facebook' })
      .andWhere('post.sourceCreatedAt IS NOT NULL')
      .andWhere('post.sourceId NOT IN (:...fetchedIds)', { fetchedIds });

    if (hasMorePages || fbPosts.length >= limit) {
      query = query.andWhere('post.sourceCreatedAt > :oldestFetchedDate', {
        oldestFetchedDate,
      });
    } else {
      query = query.andWhere('post.sourceCreatedAt >= :oldestFetchedDate', {
        oldestFetchedDate,
      });
    }

    const stalePosts = await query.getMany();
    if (stalePosts.length === 0) {
      return 0;
    }

    let removed = 0;
    for (const stalePost of stalePosts) {
      try {
        await this.delete(stalePost.id, userId);
        removed += 1;
      } catch (error) {
        this.logger.warn(
          `Failed to remove stale Facebook post ${stalePost.sourceId ?? stalePost.id}: ${
            (error as any)?.message || error
          }`,
        );
      }
    }

    return removed;
  }

  private async removeAllFacebookPostsForUser(userId: string): Promise<number> {
    const posts = await this.postRepository.find({
      where: { userId, source: 'facebook' },
      select: ['id'],
    });

    if (posts.length === 0) {
      return 0;
    }

    let removed = 0;
    for (const post of posts) {
      try {
        await this.delete(post.id, userId);
        removed += 1;
      } catch (error) {
        this.logger.warn(`Failed to remove Facebook post ${post.id}: ${(error as any)?.message || error}`);
      }
    }

    return removed;
  }

  private getFacebookConfig(options?: { pageId?: string; accessToken?: string; limit?: number }) {
    const pageId = options?.pageId || this.configService.get<string>('FB_PAGE_ID');
    const accessToken = options?.accessToken || this.configService.get<string>('FB_PAGE_ACCESS_TOKEN');
    const limit = Math.min(Math.max(options?.limit ?? 10, 1), 50);
    const version = this.configService.get<string>('FB_GRAPH_VERSION', 'v19.0');
    const fields = [
      'message',
      'created_time',
      'full_picture',
      'permalink_url',
      'attachments{media_type,media,subattachments{media_type,media}}',
    ].join(',');

    return { pageId, accessToken, limit, version, fields };
  }

  private isFacebookSyncEnabled(): boolean {
    const flag = this.configService.get<string>('FB_SYNC_ENABLED', 'true');
    return flag.toLowerCase() !== 'false';
  }

  private async getFacebookBotUserId(): Promise<string | null> {
    if (!this.isFacebookSyncEnabled()) {
      return null;
    }

    const botEmail = this.configService.get<string>('FB_BOT_EMAIL', 'fb-bot@datn.local');
    const botUsername = this.configService.get<string>('FB_BOT_USERNAME', 'datn_fb');
    const bot = await this.userRepository.findOne({
      where: [{ email: botEmail }, { username: botUsername }],
      select: ['id'],
    });

    return bot?.id ?? null;
  }

  private getFacebookFeedRefreshCooldownMs(): number {
    const seconds =
      Number(this.configService.get<string>('FB_FEED_REFRESH_COOLDOWN_SECONDS', '60')) || 60;
    return Math.max(15, seconds) * 1000;
  }

  private async refreshFacebookPostsIfNeeded(): Promise<void> {
    if (!this.isFacebookSyncEnabled()) {
      return;
    }

    const cooldownMs = this.getFacebookFeedRefreshCooldownMs();
    if (Date.now() - this.lastFacebookFeedRefreshAt < cooldownMs) {
      return;
    }

    if (this.facebookFeedRefreshInFlight) {
      await this.facebookFeedRefreshInFlight;
      return;
    }

    this.facebookFeedRefreshInFlight = (async () => {
      try {
        const botUserId = await this.getFacebookBotUserId();
        if (!botUserId) {
          return;
        }

        await this.importFromFacebookPage(botUserId, { limit: 5 });
      } catch (error) {
        this.logger.warn(`Facebook feed refresh skipped: ${(error as any)?.message || error}`);
      } finally {
        this.lastFacebookFeedRefreshAt = Date.now();
        this.facebookFeedRefreshInFlight = null;
      }
    })();

    await this.facebookFeedRefreshInFlight;
  }

  private getEffectivePostDate(post: Pick<Post, 'createdAt' | 'sourceCreatedAt'>): Date {
    return post.sourceCreatedAt ?? post.createdAt;
  }

  /**
   * Re-upload Facebook CDN media to Cloudinary for permanent URLs.
   * Uses a deterministic publicId derived from sourceId to avoid duplicate uploads.
   */
  private async reuploadMediaToCloudinary(
    media: Array<{ url: string; type: MediaType }>,
    sourceId?: string,
  ): Promise<Array<{ url: string; type: MediaType }>> {
    const FB_FOLDER = 'datn-social/facebook';
    const results: Array<{ url: string; type: MediaType }> = [];
    for (let i = 0; i < media.length; i++) {
      const item = media[i];
      const publicId = sourceId ? `${sourceId.replace(/[^a-zA-Z0-9_-]/g, '_')}_${i}` : undefined;
      const permanentUrl = await this.cloudinaryService.uploadFromUrl(
        item.url,
        FB_FOLDER,
        item.type === MediaType.VIDEO ? 'video' : 'image',
        publicId,
      );
      results.push({ url: permanentUrl, type: item.type });
    }
    return results;
  }

  private async createExternalPost(
    userId: string,
    caption: string,
    mediaDto: Array<{ url: string; type: MediaType }>,
    source: string,
    sourceId: string,
    sourceCreatedAt?: Date,
  ): Promise<Post> {
    const savedPost = await this.dataSource.transaction(async (manager) => {
      const post = manager.create(Post, {
        userId,
        caption: caption || '',
        source,
        sourceId,
        sourceCreatedAt: sourceCreatedAt ?? null,
      });
      const createdPost = await manager.save(post);

      await this.processMedia(manager, createdPost.id, mediaDto);
      await this.processHashtags(manager, createdPost.id, caption);
      await this.processMentions(manager, createdPost.id, caption);

      return createdPost;
    });

    const [post] = await this.enrichPosts([savedPost], userId);
    return post;
  }

  async enrichPosts(posts: Post[], viewerId?: string): Promise<Post[]> {
    if (posts.length === 0) {
      return [];
    }

    const postIds = posts.map((post) => post.id);
    const userIds = Array.from(new Set(posts.map((post) => post.userId)));

    const [users, media, postHashtags, likes, commentsList, savedList] = await Promise.all([
      this.userRepository.find({ where: { id: In(userIds) } }),
      this.mediaRepository.find({
        where: { postId: In(postIds) },
        order: { orderIndex: 'ASC' },
      }),
      this.postHashtagRepository.find({
        where: { postId: In(postIds) },
        relations: ['hashtag'],
      }),
      this.likeRepository.find({ where: { postId: In(postIds) } }),
      this.commentRepository.find({
        where: { postId: In(postIds), status: CommentStatus.VISIBLE },
        select: ['id', 'postId'],
      }),
      viewerId
        ? this.savedPostRepository.find({ where: { userId: viewerId, postId: In(postIds) } })
        : Promise.resolve([]),
    ]);

    const userMap = new Map(users.map((user) => [user.id, user]));
    const mediaMap = new Map<string, Media[]>();
    const hashtagMap = new Map<string, PostHashtag[]>();
    const likesCountMap = new Map<string, number>();
    const commentsCountMap = new Map<string, number>();
    const likedPostIds = new Set<string>();
    const savedPostIds = new Set<string>(savedList.map((s) => s.postId));

    media.forEach((item) => {
      const items = mediaMap.get(item.postId) ?? [];
      items.push(item);
      mediaMap.set(item.postId, items);
    });

    postHashtags.forEach((item) => {
      const items = hashtagMap.get(item.postId) ?? [];
      items.push(item);
      hashtagMap.set(item.postId, items);
    });

    likes.forEach((like) => {
      likesCountMap.set(like.postId, (likesCountMap.get(like.postId) ?? 0) + 1);
      if (viewerId && like.userId === viewerId) {
        likedPostIds.add(like.postId);
      }
    });

    commentsList.forEach((comment) => {
      commentsCountMap.set(comment.postId, (commentsCountMap.get(comment.postId) ?? 0) + 1);
    });

    return posts.map(
      (post) =>
        ({
          ...post,
          createdAt: this.getEffectivePostDate(post),
          user: userMap.get(post.userId) ?? (post.user as User),
          media: mediaMap.get(post.id) ?? [],
          postHashtags: hashtagMap.get(post.id) ?? [],
          likesCount: likesCountMap.get(post.id) ?? 0,
          commentsCount: commentsCountMap.get(post.id) ?? 0,
          liked: viewerId ? likedPostIds.has(post.id) : false,
          saved: viewerId ? savedPostIds.has(post.id) : false,
        }) as Post,
    );
  }

  async create(userId: string, createPostDto: CreatePostDto): Promise<Post> {
    const normalizedCaption = (createPostDto.caption ?? '').trim();
    const mediaDto = createPostDto.media ?? [];

    if (normalizedCaption) {
      const moderation = await this.aiService.moderateContent(normalizedCaption);
      if (!moderation.isSafe) {
        const reason = moderation.reason || 'Vi phạm chính sách cộng đồng.';
        this.logger.warn(
          `Blocked unsafe post from user ${userId}: ${reason} (length=${normalizedCaption.length})`,
        );
        throw new BadRequestException(`Nội dung không phù hợp: ${reason}`);
      }

      const sentiment = await this.aiService.detectSentiment(normalizedCaption);
      this.logger.log(
        `AI sentiment telemetry user=${userId} label=${sentiment.label} score=${
          sentiment.score ?? 'n/a'
        } length=${normalizedCaption.length}`,
      );
    }

    let mentionedUsers: User[] = [];

    const savedPost = await this.dataSource.transaction(async (manager) => {
      const post = manager.create(Post, { userId, caption: normalizedCaption });
      const createdPost = await manager.save(post);

      await this.processMedia(manager, createdPost.id, mediaDto);
      await this.processHashtags(manager, createdPost.id, normalizedCaption);
      mentionedUsers = await this.processMentions(manager, createdPost.id, normalizedCaption, userId);

      return createdPost;
    });

    this.dispatchPostTagNotifications(userId, savedPost.id, mentionedUsers);

    const [post] = await this.enrichPosts([savedPost], userId);
    return post;
  }

  async getFeed(
    userId: string,
    cursor?: string,
    limit = 20,
  ): Promise<{ posts: Post[]; nextCursor: string | null }> {
    if (!cursor) {
      await this.refreshFacebookPostsIfNeeded();
    }

    const [following, facebookBotUserId] = await Promise.all([
      this.followRepository.find({
        where: { followerId: userId },
        select: ['followingId'],
      }),
      this.getFacebookBotUserId(),
    ]);

    const userIds = Array.from(
      new Set([
        userId,
        ...following.map((item) => item.followingId),
        ...(facebookBotUserId ? [facebookBotUserId] : []),
      ]),
    );
    const sortExpression = 'COALESCE("post"."sourceCreatedAt", "post"."createdAt")';

    let query = this.postRepository
      .createQueryBuilder('post')
      .where('post.userId IN (:...userIds)', { userIds })
      .andWhere('post.status = :status', { status: PostStatus.VISIBLE })
      // Own pinned post bubbles to top; others' posts are purely chronological
      .orderBy(`CASE WHEN "post"."user_id" = :currentUserId AND "post"."isPinned" = true THEN 1 ELSE 0 END`, 'DESC')
      .addOrderBy(sortExpression, 'DESC')
      .addOrderBy('post.id', 'DESC')
      .setParameter('currentUserId', userId)
      .limit(limit + 1);

    if (cursor) {
      query = query.andWhere(`${sortExpression} < :cursor`, { cursor: new Date(cursor) });
    }

    const rawPosts = await query.getMany();
    const hasMore = rawPosts.length > limit;
    const visiblePosts = hasMore ? rawPosts.slice(0, limit) : rawPosts;
    const posts = await this.enrichPosts(visiblePosts, userId);
    const nextCursor = hasMore
      ? this.getEffectivePostDate(visiblePosts[visiblePosts.length - 1]).toISOString()
      : null;

    return { posts, nextCursor };
  }

  async getPostsByUser(
    targetUserId: string,
    viewerId?: string,
    cursor?: string,
    limit = 24,
  ): Promise<{ posts: Post[]; nextCursor: string | null }> {
    const sortExpression = 'COALESCE("post"."sourceCreatedAt", "post"."createdAt")';
    let query = this.postRepository
      .createQueryBuilder('post')
      .where('post.userId = :userId', { userId: targetUserId })
      .andWhere('post.status = :status', { status: PostStatus.VISIBLE })
      .orderBy('post.isPinned', 'DESC')
      .addOrderBy(sortExpression, 'DESC')
      .addOrderBy('post.id', 'DESC')
      .limit(limit + 1);

    if (cursor) {
      query = query.andWhere(`${sortExpression} < :cursor`, { cursor: new Date(cursor) });
    }

    const rawPosts = await query.getMany();
    const hasMore = rawPosts.length > limit;
    const visiblePosts = hasMore ? rawPosts.slice(0, limit) : rawPosts;
    const posts = await this.enrichPosts(visiblePosts, viewerId);
    const nextCursor = hasMore
      ? this.getEffectivePostDate(visiblePosts[visiblePosts.length - 1]).toISOString()
      : null;

    return { posts, nextCursor };
  }

  async findById(id: string, viewerId?: string): Promise<Post> {
    const post = await this.postRepository.findOne({
      where: { id, status: PostStatus.VISIBLE },
    });

    if (!post) {
      throw new NotFoundException('Post not found');
    }

    const [enrichedPost] = await this.enrichPosts([post], viewerId);
    return enrichedPost;
  }

  async togglePin(postId: string, userId: string): Promise<boolean> {
    const post = await this.postRepository.findOne({
      where: { id: postId, userId },
      select: ['id', 'isPinned'],
    });

    if (!post) {
      throw new NotFoundException('Post not found or unauthorized');
    }

    const newPinnedStatus = !post.isPinned;

    if (newPinnedStatus) {
      await this.postRepository.update(
        { userId, isPinned: true },
        { isPinned: false },
      );
    }

    await this.postRepository.update(post.id, { isPinned: newPinnedStatus });
    return newPinnedStatus;
  }

  async updateCaption(postId: string, userId: string, caption: string): Promise<Post> {
    const post = await this.postRepository.findOne({
      where: { id: postId, userId },
    });

    if (!post) {
      throw new NotFoundException('Post not found or unauthorized');
    }

    const normalizedCaption = (caption ?? '').trim();

    if (normalizedCaption !== post.caption) {
      if (normalizedCaption) {
        const moderation = await this.aiService.moderateContent(normalizedCaption);
        if (!moderation.isSafe) {
          const reason = moderation.reason || 'Vi phạm chính sách cộng đồng.';
          this.logger.warn(
            `Blocked unsafe post edit from user ${userId}: ${reason} (length=${normalizedCaption.length})`,
          );
          throw new BadRequestException(`Nội dung không phù hợp: ${reason}`);
        }
      }

      let oldMentionUserIds = new Set<string>();
      let mentionedUsers: User[] = [];

      await this.dataSource.transaction(async (manager) => {
        await manager.update(Post, post.id, {
          caption: normalizedCaption,
          isEdited: true,
        });

        const oldPostHashtags = await manager.find(PostHashtag, { where: { postId: post.id } });
        if (oldPostHashtags.length > 0) {
          const hashtagIds = oldPostHashtags.map((ph) => ph.hashtagId);
          await manager
            .createQueryBuilder()
            .update(Hashtag)
            .set({ count: () => '"count" - 1' })
            .whereInIds(hashtagIds)
            .execute();
          await manager.delete(PostHashtag, { postId: post.id });
        }

        const oldMentions = await manager.find(PostMention, {
          where: { postId: post.id },
        });
        oldMentionUserIds = new Set(oldMentions.map((mention) => mention.userId));

        await manager.delete(PostMention, { postId: post.id });

        await this.processHashtags(manager, post.id, normalizedCaption);
        mentionedUsers = await this.processMentions(manager, post.id, normalizedCaption, userId);
      });

      const newMentionedUsers = mentionedUsers.filter(
        (mentionedUser) => !oldMentionUserIds.has(mentionedUser.id),
      );
      this.dispatchPostTagNotifications(userId, post.id, newMentionedUsers);
    }

    return this.findById(post.id, userId);
  }

  async delete(id: string, userId: string): Promise<void> {
    const post = await this.postRepository.findOne({ where: { id } });
    if (!post || post.userId !== userId) {
      throw new NotFoundException('Post not found or unauthorized');
    }

    await this.dataSource.transaction(async (manager) => {
      const postHashtags = await manager.find(PostHashtag, { where: { postId: id } });
      if (postHashtags.length > 0) {
        const hashtagIds = postHashtags.map((ph) => ph.hashtagId);
        await manager
          .createQueryBuilder()
          .update(Hashtag)
          .set({ count: () => '"count" - 1' })
          .whereInIds(hashtagIds)
          .execute();

        await manager.delete(PostHashtag, { postId: id });
      }

      await manager.delete(PostMention, { postId: id });
      await manager.delete(Like, { postId: id });
      await manager.delete(Comment, { postId: id });
      await manager.delete(SavedPost, { postId: id });
      await manager.delete(Media, { postId: id });
      await manager.delete(Post, { id });
    });
  }

  async deleteFacebookPostById(userId: string, sourceId: string): Promise<boolean> {
    const post = await this.postRepository.findOne({
      where: { userId, source: 'facebook', sourceId },
      select: ['id'],
    });

    if (!post) {
      return false;
    }

    await this.delete(post.id, userId);
    return true;
  }

  async getTaggedPosts(
    userId: string,
    viewerId?: string,
    cursor?: string,
    limit = 24,
  ): Promise<{ posts: Post[]; nextCursor: string | null }> {
    const sortExpression = 'COALESCE("post"."sourceCreatedAt", "post"."createdAt")';
    let query = this.postMentionRepository
      .createQueryBuilder('mention')
      .where('mention.userId = :userId', { userId })
      .leftJoinAndSelect('mention.post', 'post')
      .andWhere('post.status = :status', { status: PostStatus.VISIBLE })
      .orderBy(sortExpression, 'DESC')
      .addOrderBy('post.id', 'DESC')
      .limit(limit + 1);

    if (cursor) {
      query = query.andWhere(`${sortExpression} < :cursor`, { cursor: new Date(cursor) });
    }

    const rawMentions = await query.getMany();
    const rawPosts = rawMentions.map((m) => m.post).filter(Boolean);
    const hasMore = rawPosts.length > limit;
    const visiblePosts = hasMore ? rawPosts.slice(0, limit) : rawPosts;
    const posts = await this.enrichPosts(visiblePosts, viewerId);
    const nextCursor = hasMore
      ? this.getEffectivePostDate(visiblePosts[visiblePosts.length - 1]).toISOString()
      : null;

    return { posts, nextCursor };
  }

  async getSavedPosts(
    userId: string,
    viewerId?: string,
    cursor?: string,
    limit = 24,
  ): Promise<{ posts: Post[]; nextCursor: string | null }> {
    let query = this.savedPostRepository
      .createQueryBuilder('saved')
      .where('saved.userId = :userId', { userId })
      .leftJoinAndSelect('saved.post', 'post')
      .andWhere('post.status = :status', { status: PostStatus.VISIBLE })
      .orderBy('saved.createdAt', 'DESC')
      .limit(limit + 1);

    if (cursor) {
      query = query.andWhere('saved.createdAt < :cursor', { cursor: new Date(cursor) });
    }

    const rawSaved = await query.getMany();
    const rawPosts = rawSaved.map((s) => s.post).filter(Boolean);
    const hasMore = rawPosts.length > limit;
    const visiblePosts = hasMore ? rawPosts.slice(0, limit) : rawPosts;
    const posts = await this.enrichPosts(visiblePosts, viewerId);
    const nextCursor = hasMore ? rawSaved[visiblePosts.length - 1].createdAt.toISOString() : null;

    return { posts, nextCursor };
  }

  async importFromFacebookPage(
    userId: string,
    options?: { pageId?: string; accessToken?: string; limit?: number },
  ): Promise<{ imported: Post[]; skipped: number; removed: number }> {
    const { pageId, accessToken, limit, version, fields } = this.getFacebookConfig(options);

    if (!pageId || !accessToken) {
      throw new BadRequestException('Missing Facebook page credentials.');
    }

    let response;
    try {
      response = await axios.get(`https://graph.facebook.com/${version}/${pageId}/posts`, {
        params: {
          access_token: accessToken,
          fields,
          limit,
        },
      });
    } catch (error) {
      if (axios.isAxiosError(error)) {
        const fbMessage =
          (error.response?.data as any)?.error?.message ||
          error.response?.statusText ||
          error.message;
        throw new BadRequestException(`Facebook import failed: ${fbMessage}`);
      }
      throw error;
    }

    const fbPosts = response.data?.data ?? [];
    if (!Array.isArray(fbPosts) || fbPosts.length === 0) {
      const removed = await this.removeAllFacebookPostsForUser(userId);
      return { imported: [], skipped: 0, removed };
    }

    const hasMorePages = Boolean(response.data?.paging?.next);

    const sourceIds = fbPosts.map((post: any) => post.id).filter(Boolean);
    const existing = await this.postRepository.find({
      where: {
        userId,
        source: 'facebook',
        sourceId: In(sourceIds),
      },
      select: ['id', 'sourceId', 'sourceCreatedAt', 'caption'],
    });
    const existingBySourceId = new Map(existing.map((item) => [item.sourceId, item]));

    const imported: Post[] = [];
    let skipped = 0;

    for (const fbPost of fbPosts) {
      if (!fbPost?.id) continue;
      const sourceCreatedAt = fbPost.created_time ? new Date(fbPost.created_time) : undefined;
      const existingPost = existingBySourceId.get(fbPost.id);
      const caption = fbPost.message || '';

      if (existingPost) {
        const updateData: Partial<Post> = {};
        if (!existingPost.sourceCreatedAt && sourceCreatedAt) {
          updateData.sourceCreatedAt = sourceCreatedAt;
        }
        if (existingPost.caption !== caption) {
          updateData.caption = caption;
        }
        if (Object.keys(updateData).length > 0) {
          await this.postRepository.update(existingPost.id, updateData);
        }
        skipped += 1;
        continue;
      }

      const rawMedia = this.normalizeFacebookMedia(fbPost);
      const media = await this.reuploadMediaToCloudinary(rawMedia, fbPost.id);

      const created = await this.createExternalPost(
        userId,
        caption,
        media,
        'facebook',
        fbPost.id,
        sourceCreatedAt,
      );
      imported.push(created);
    }

    const removed = await this.reconcileRemovedFacebookPosts(userId, fbPosts, limit, hasMorePages);

    return { imported, skipped, removed };
  }

  async importFacebookPostById(
    userId: string,
    postId: string,
    options?: { accessToken?: string },
  ): Promise<{ imported: Post | null; skipped: boolean }> {
    const { accessToken, version, fields } = this.getFacebookConfig({
      accessToken: options?.accessToken,
    });

    if (!postId || !accessToken) {
      throw new BadRequestException('Missing Facebook post credentials.');
    }

    let response;
    try {
      response = await axios.get(`https://graph.facebook.com/${version}/${postId}`, {
        params: {
          access_token: accessToken,
          fields,
        },
      });
    } catch (error) {
      if (axios.isAxiosError(error)) {
        const fbMessage =
          (error.response?.data as any)?.error?.message ||
          error.response?.statusText ||
          error.message;
        throw new BadRequestException(`Facebook import failed: ${fbMessage}`);
      }
      throw error;
    }

    const fbPost = response.data;
    if (!fbPost?.id) {
      return { imported: null, skipped: true };
    }

    const existing = await this.postRepository.findOne({
      where: {
        userId,
        source: 'facebook',
        sourceId: fbPost.id,
      },
      select: ['id', 'sourceCreatedAt', 'caption'],
    });

    const sourceCreatedAt = fbPost.created_time ? new Date(fbPost.created_time) : undefined;
    const caption = fbPost.message || '';

    if (existing) {
      const updateData: Partial<Post> = {};
      if (!existing.sourceCreatedAt && sourceCreatedAt) {
        updateData.sourceCreatedAt = sourceCreatedAt;
      }
      if (existing.caption !== caption) {
        updateData.caption = caption;
      }
      if (Object.keys(updateData).length > 0) {
        await this.postRepository.update(existing.id, updateData);
      }
      return { imported: null, skipped: true };
    }

    const rawMedia = this.normalizeFacebookMedia(fbPost);
    const media = await this.reuploadMediaToCloudinary(rawMedia, fbPost.id);
    const created = await this.createExternalPost(
      userId,
      caption,
      media,
      'facebook',
      fbPost.id,
      sourceCreatedAt,
    );

    return { imported: created, skipped: false };
  }
}
