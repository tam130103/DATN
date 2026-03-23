import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource, In, EntityManager } from 'typeorm';
import axios from 'axios';
import { ConfigService } from '@nestjs/config';
import { Post } from './entities/post.entity';
import { Media, MediaType } from './entities/media.entity';
import { Hashtag } from './entities/hashtag.entity';
import { PostHashtag } from './entities/post-hashtag.entity';
import { PostMention } from './entities/post-mention.entity';
import { CreatePostDto } from './dto/create-post.dto';
import { Follow } from '../user/entities/follow.entity';
import { User } from '../user/entities/user.entity';
import { Like } from '../engagement/entities/like.entity';
import { Comment } from '../engagement/entities/comment.entity';

@Injectable()
export class PostService {
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
    private readonly dataSource: DataSource,
    private readonly configService: ConfigService,
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
    const regex = /@([a-zA-Z0-9_.]+)/g;
    const mentions = new Set<string>();
    let match: RegExpExecArray | null;

    while ((match = regex.exec(caption)) !== null) {
      mentions.add(match[1].toLowerCase());
    }

    return Array.from(mentions);
  }

  private async processMedia(manager: EntityManager, postId: string, mediaDto: Array<{ url: string; type: MediaType }>) {
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
      where: hashtagNames.map(name => ({ name })) 
    });
    
    const existingNames = new Set(existingTags.map(t => t.name));
    const newNames = hashtagNames.filter(name => !existingNames.has(name));

    let newTags: Hashtag[] = [];
    if (newNames.length > 0) {
      const created = newNames.map(name => manager.create(Hashtag, { name, count: 0 }));
      newTags = await manager.save(created);
    }

    const allTags = [...existingTags, ...newTags];

    if (allTags.length > 0) {
      await manager.createQueryBuilder()
        .update(Hashtag)
        .set({ count: () => '"count" + 1' })
        .whereInIds(allTags.map(t => t.id))
        .execute();
    }

    const postHashtags = allTags.map(tag => manager.create(PostHashtag, { postId, hashtagId: tag.id }));
    await manager.save(postHashtags);
  }

  private async processMentions(manager: EntityManager, postId: string, caption: string) {
    const mentionUsernames = this.extractMentions(caption || '');
    if (mentionUsernames.length === 0) return;
    
    const mentionedUsers = await manager.find(User, {
      where: mentionUsernames.map((username) => ({ username })),
    });
    
    if (mentionedUsers.length > 0) {
      const mentions = mentionedUsers.map(user => manager.create(PostMention, { postId, userId: user.id }));
      await manager.save(mentions);
    }
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

  private async createExternalPost(
    userId: string,
    caption: string,
    mediaDto: Array<{ url: string; type: MediaType }>,
    source: string,
    sourceId: string,
    createdAt?: Date,
  ): Promise<Post> {
    const savedPost = await this.dataSource.transaction(async (manager) => {
      const post = manager.create(Post, {
        userId,
        caption: caption || '',
        source,
        sourceId,
        createdAt: createdAt ?? undefined,
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

    const [users, media, postHashtags, likes, commentsList] = await Promise.all([
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
        where: { postId: In(postIds) },
        select: ['id', 'postId'],
      }),
    ]);

    const userMap = new Map(users.map((user) => [user.id, user]));
    const mediaMap = new Map<string, Media[]>();
    const hashtagMap = new Map<string, PostHashtag[]>();
    const likesCountMap = new Map<string, number>();
    const commentsCountMap = new Map<string, number>();
    const likedPostIds = new Set<string>();

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

    return posts.map((post) => ({
      ...post,
      user: userMap.get(post.userId) ?? (post.user as User),
      media: mediaMap.get(post.id) ?? [],
      postHashtags: hashtagMap.get(post.id) ?? [],
      likesCount: likesCountMap.get(post.id) ?? 0,
      commentsCount: commentsCountMap.get(post.id) ?? 0,
      liked: viewerId ? likedPostIds.has(post.id) : false,
    } as Post));
  }

  async create(userId: string, createPostDto: CreatePostDto): Promise<Post> {
    const { caption, media: mediaDto } = createPostDto;

    const savedPost = await this.dataSource.transaction(async (manager) => {
      const post = manager.create(Post, { userId, caption });
      const createdPost = await manager.save(post);

      await this.processMedia(manager, createdPost.id, mediaDto);
      await this.processHashtags(manager, createdPost.id, caption);
      await this.processMentions(manager, createdPost.id, caption);

      return createdPost;
    });

    const [post] = await this.enrichPosts([savedPost], userId);
    return post;
  }

  async getFeed(
    userId: string,
    cursor?: string,
    limit = 20,
  ): Promise<{ posts: Post[]; nextCursor: string | null }> {
    const following = await this.followRepository.find({
      where: { followerId: userId },
      select: ['followingId'],
    });

    const userIds = [userId, ...following.map((item) => item.followingId)];

    let query = this.postRepository
      .createQueryBuilder('post')
      .where('post.userId IN (:...userIds)', { userIds })
      .orderBy('post.createdAt', 'DESC')
      .limit(limit + 1);

    if (cursor) {
      query = query.andWhere('post.createdAt < :cursor', { cursor: new Date(cursor) });
    }

    const rawPosts = await query.getMany();
    const hasMore = rawPosts.length > limit;
    const visiblePosts = hasMore ? rawPosts.slice(0, limit) : rawPosts;
    const posts = await this.enrichPosts(visiblePosts, userId);
    const nextCursor = hasMore
      ? visiblePosts[visiblePosts.length - 1].createdAt.toISOString()
      : null;

    return { posts, nextCursor };
  }

  async getPostsByUser(
    targetUserId: string,
    viewerId?: string,
    cursor?: string,
    limit = 24,
  ): Promise<{ posts: Post[]; nextCursor: string | null }> {
    let query = this.postRepository
      .createQueryBuilder('post')
      .where('post.userId = :userId', { userId: targetUserId })
      .orderBy('post.createdAt', 'DESC')
      .limit(limit + 1);

    if (cursor) {
      query = query.andWhere('post.createdAt < :cursor', { cursor: new Date(cursor) });
    }

    const rawPosts = await query.getMany();
    const hasMore = rawPosts.length > limit;
    const visiblePosts = hasMore ? rawPosts.slice(0, limit) : rawPosts;
    const posts = await this.enrichPosts(visiblePosts, viewerId);
    const nextCursor = hasMore
      ? visiblePosts[visiblePosts.length - 1].createdAt.toISOString()
      : null;

    return { posts, nextCursor };
  }

  async findById(id: string, viewerId?: string): Promise<Post> {
    const post = await this.postRepository.findOne({
      where: { id },
    });

    if (!post) {
      throw new NotFoundException('Post not found');
    }

    const [enrichedPost] = await this.enrichPosts([post], viewerId);
    return enrichedPost;
  }

  async delete(id: string, userId: string): Promise<void> {
    const post = await this.postRepository.findOne({ where: { id } });
    if (!post || post.userId !== userId) {
      throw new NotFoundException('Post not found or unauthorized');
    }

    await this.dataSource.transaction(async (manager) => {
      // 1. Decrement hashtag counts and delete post_hashtags relationships
      const postHashtags = await manager.find(PostHashtag, { where: { postId: id } });
      if (postHashtags.length > 0) {
        const hashtagIds = postHashtags.map(ph => ph.hashtagId);
        await manager.createQueryBuilder()
          .update(Hashtag)
          .set({ count: () => '"count" - 1' })
          .whereInIds(hashtagIds)
          .execute();
        
        await manager.delete(PostHashtag, { postId: id });
      }

      // 2. Delete other related records in order to respect constraints
      await manager.delete(PostMention, { postId: id });
      await manager.delete(Like, { postId: id });
      await manager.delete(Comment, { postId: id });
      await manager.delete(Media, { postId: id });

      // 3. Finally delete the post itself
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
    let query = this.postMentionRepository
      .createQueryBuilder('mention')
      .where('mention.userId = :userId', { userId })
      .leftJoinAndSelect('mention.post', 'post')
      .orderBy('post.createdAt', 'DESC')
      .limit(limit + 1);

    if (cursor) {
      query = query.andWhere('post.createdAt < :cursor', { cursor: new Date(cursor) });
    }

    const rawMentions = await query.getMany();
    const rawPosts = rawMentions.map(m => m.post).filter(Boolean);
    const hasMore = rawPosts.length > limit;
    const visiblePosts = hasMore ? rawPosts.slice(0, limit) : rawPosts;
    const posts = await this.enrichPosts(visiblePosts, viewerId);
    const nextCursor = hasMore
      ? visiblePosts[visiblePosts.length - 1].createdAt.toISOString()
      : null;

    return { posts, nextCursor };
  }

  async importFromFacebookPage(
    userId: string,
    options?: { pageId?: string; accessToken?: string; limit?: number },
  ): Promise<{ imported: Post[]; skipped: number }> {
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
      return { imported: [], skipped: 0 };
    }

    const sourceIds = fbPosts.map((post: any) => post.id).filter(Boolean);
    const existing = await this.postRepository.find({
      where: {
        userId,
        source: 'facebook',
        sourceId: In(sourceIds),
      },
      select: ['sourceId'],
    });
    const existingIds = new Set(existing.map((item) => item.sourceId));

    const imported: Post[] = [];
    let skipped = 0;

    for (const fbPost of fbPosts) {
      if (!fbPost?.id) continue;
      if (existingIds.has(fbPost.id)) {
        skipped += 1;
        continue;
      }

      const caption = fbPost.message || '';
      const media = this.normalizeFacebookMedia(fbPost);
      const createdAt = fbPost.created_time ? new Date(fbPost.created_time) : undefined;

      const created = await this.createExternalPost(
        userId,
        caption,
        media,
        'facebook',
        fbPost.id,
        createdAt,
      );
      imported.push(created);
    }

    return { imported, skipped };
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
      select: ['id'],
    });

    if (existing) {
      return { imported: null, skipped: true };
    }

    const caption = fbPost.message || '';
    const media = this.normalizeFacebookMedia(fbPost);
    const createdAt = fbPost.created_time ? new Date(fbPost.created_time) : undefined;
    const created = await this.createExternalPost(
      userId,
      caption,
      media,
      'facebook',
      fbPost.id,
      createdAt,
    );

    return { imported: created, skipped: false };
  }
}
