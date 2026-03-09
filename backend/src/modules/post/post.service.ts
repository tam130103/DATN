import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource, In } from 'typeorm';
import { Post } from './entities/post.entity';
import { Media } from './entities/media.entity';
import { Hashtag } from './entities/hashtag.entity';
import { PostHashtag } from './entities/post-hashtag.entity';
import { CreatePostDto } from './dto/create-post.dto';
import { Follow } from '../user/entities/follow.entity';

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
    private readonly dataSource: DataSource,
  ) {}

  // Extract hashtags from caption (#hashtag)
  private extractHashtags(caption: string): string[] {
    const regex = /#(\w+)/g;
    const hashtags = new Set<string>();
    let match;
    while ((match = regex.exec(caption)) !== null) {
      hashtags.add(match[1].toLowerCase());
    }
    return Array.from(hashtags);
  }

  async create(userId: string, createPostDto: CreatePostDto): Promise<Post> {
    const { caption, media: mediaDto } = createPostDto;

    const savedPost = await this.dataSource.transaction(async (manager) => {
      // Create post
      const post = manager.create(Post, { userId, caption });
      const savedPost = await manager.save(post);

      // Create media with orderIndex (if provided)
      if (mediaDto && mediaDto.length > 0) {
        const mediaEntities = mediaDto.map((m, index) =>
          manager.create(Media, {
            postId: savedPost.id,
            url: m.url,
            type: m.type,
            orderIndex: index,
          }),
        );
        await manager.save(mediaEntities);
      }

      // Extract and create hashtags
      const hashtagNames = this.extractHashtags(caption);
      for (const name of hashtagNames) {
        let hashtag = await manager.findOne(Hashtag, { where: { name } });
        if (!hashtag) {
          hashtag = manager.create(Hashtag, { name, count: 0 });
          hashtag = await manager.save(hashtag);
        }

        // Increment hashtag count
        await manager.increment(Hashtag, { id: hashtag.id }, 'count', 1);

        // Link post to hashtag
        const postHashtag = manager.create(PostHashtag, {
          postId: savedPost.id,
          hashtagId: hashtag.id,
        });
        await manager.save(postHashtag);
      }

      return savedPost;
    });

    // Load media separately after transaction
    const media = await this.mediaRepository.find({
      where: { postId: savedPost.id },
      order: { orderIndex: 'ASC' },
    });

    return { ...savedPost, media } as Post;
  }

  async getFeed(userId: string, cursor?: string, limit = 20): Promise<{ posts: Post[]; nextCursor: string | null }> {
    // Get following IDs using plain find
    const following = await this.followRepository.find({
      where: { followerId: userId },
      select: ['followingId']
    });

    const userIds = [userId, ...following.map((f) => f.followingId)];

    // Get posts without relations first
    let query = this.postRepository
      .createQueryBuilder('post')
      .where('post.userId IN (:...userIds)', { userIds })
      .orderBy('post.createdAt', 'DESC')
      .limit(limit + 1);

    if (cursor) {
      query = query.andWhere('post.createdAt < :cursor', { cursor: new Date(cursor) });
    }

    const posts = await query.getMany();

    // Load media for each post separately
    const postsWithMedia = await Promise.all(
      posts.map(async (post) => {
        const media = await this.mediaRepository.find({
          where: { postId: post.id },
          order: { orderIndex: 'ASC' }
        });
        return { ...post, media } as Post;
      })
    );

    let nextCursor: string | null = null;
    if (postsWithMedia.length > limit) {
      postsWithMedia.pop();
      nextCursor = postsWithMedia[postsWithMedia.length - 1].createdAt.toISOString();
    }

    return { posts: postsWithMedia, nextCursor };
  }

  async findById(id: string): Promise<Post> {
    const post = await this.postRepository.findOne({
      where: { id },
    });

    if (!post) {
      throw new NotFoundException('Post not found');
    }

    // Load media separately to avoid type casting issues
    const media = await this.mediaRepository.find({
      where: { postId: id },
      order: { orderIndex: 'ASC' },
    });

    return { ...post, media } as Post;
  }

  async delete(id: string, userId: string): Promise<void> {
    const post = await this.postRepository.findOne({ where: { id } });
    if (!post || post.userId !== userId) {
      throw new NotFoundException('Post not found or unauthorized');
    }

    await this.dataSource.transaction(async (manager) => {
      // Decrement hashtag counts
      const postHashtags = await manager.find(PostHashtag, { where: { postId: id } });
      for (const ph of postHashtags) {
        await manager.decrement(Hashtag, { id: ph.hashtagId }, 'count', 1);
      }

      await manager.delete(Post, { id });
    });
  }
}
