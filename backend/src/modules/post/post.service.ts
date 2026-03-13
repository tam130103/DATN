import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource, In } from 'typeorm';
import { Post } from './entities/post.entity';
import { Media } from './entities/media.entity';
import { Hashtag } from './entities/hashtag.entity';
import { PostHashtag } from './entities/post-hashtag.entity';
import { CreatePostDto } from './dto/create-post.dto';
import { Follow } from '../user/entities/follow.entity';
import { User } from '../user/entities/user.entity';
import { Like } from '../engagement/entities/like.entity';

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
    @InjectRepository(Follow)
    private readonly followRepository: Repository<Follow>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(Like)
    private readonly likeRepository: Repository<Like>,
    private readonly dataSource: DataSource,
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

  async enrichPosts(posts: Post[], viewerId?: string): Promise<Post[]> {
    if (posts.length === 0) {
      return [];
    }

    const postIds = posts.map((post) => post.id);
    const userIds = Array.from(new Set(posts.map((post) => post.userId)));

    const [users, media, postHashtags, likes] = await Promise.all([
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
    ]);

    const userMap = new Map(users.map((user) => [user.id, user]));
    const mediaMap = new Map<string, Media[]>();
    const hashtagMap = new Map<string, PostHashtag[]>();
    const likesCountMap = new Map<string, number>();
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

    return posts.map((post) => ({
      ...post,
      user: userMap.get(post.userId) ?? (post.user as User),
      media: mediaMap.get(post.id) ?? [],
      postHashtags: hashtagMap.get(post.id) ?? [],
      likesCount: likesCountMap.get(post.id) ?? 0,
      liked: viewerId ? likedPostIds.has(post.id) : false,
    } as Post));
  }

  async create(userId: string, createPostDto: CreatePostDto): Promise<Post> {
    const { caption, media: mediaDto } = createPostDto;

    const savedPost = await this.dataSource.transaction(async (manager) => {
      const post = manager.create(Post, { userId, caption });
      const createdPost = await manager.save(post);

      if (mediaDto && mediaDto.length > 0) {
        const mediaEntities = mediaDto.map((item, index) =>
          manager.create(Media, {
            postId: createdPost.id,
            url: item.url,
            type: item.type,
            orderIndex: index,
          }),
        );
        await manager.save(mediaEntities);
      }

      const hashtagNames = this.extractHashtags(caption);
      for (const name of hashtagNames) {
        let hashtag = await manager.findOne(Hashtag, { where: { name } });
        if (!hashtag) {
          hashtag = manager.create(Hashtag, { name, count: 0 });
          hashtag = await manager.save(hashtag);
        }

        await manager.increment(Hashtag, { id: hashtag.id }, 'count', 1);

        const postHashtag = manager.create(PostHashtag, {
          postId: createdPost.id,
          hashtagId: hashtag.id,
        });
        await manager.save(postHashtag);
      }

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
      const postHashtags = await manager.find(PostHashtag, { where: { postId: id } });
      for (const item of postHashtags) {
        await manager.decrement(Hashtag, { id: item.hashtagId }, 'count', 1);
      }

      await manager.delete(Post, { id });
    });
  }
}
