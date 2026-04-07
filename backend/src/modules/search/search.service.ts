import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { User, UserStatus } from '../user/entities/user.entity';
import { Hashtag } from './entities/hashtag.entity';
import { Post, PostStatus } from '../post/entities/post.entity';
import { PostHashtag } from '../post/entities/post-hashtag.entity';
import { PostService } from '../post/post.service';

@Injectable()
export class SearchService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(Hashtag)
    private readonly hashtagRepository: Repository<Hashtag>,
    @InjectRepository(Post)
    private readonly postRepository: Repository<Post>,
    @InjectRepository(PostHashtag)
    private readonly postHashtagRepository: Repository<PostHashtag>,
    private readonly postService: PostService,
  ) {}

  async searchUsers(query: string, page = 1, limit = 20): Promise<User[]> {
    return this.userRepository
      .createQueryBuilder('user')
      .where('(user.username ILIKE :query OR user.name ILIKE :query)', { query: `%${query}%` })
      .andWhere('user.status = :status', { status: UserStatus.ACTIVE })
      .take(limit)
      .skip((page - 1) * limit)
      .getMany();
  }

  async searchHashtags(query: string, page = 1, limit = 20): Promise<Hashtag[]> {
    return this.hashtagRepository
      .createQueryBuilder('hashtag')
      .where('hashtag.name ILIKE :query', { query: `${query}%` })
      .orderBy('hashtag.count', 'DESC')
      .take(limit)
      .skip((page - 1) * limit)
      .getMany();
  }

  async getHashtagPosts(name: string, viewerId: string, page = 1, limit = 20): Promise<Post[]> {
    const hashtag = await this.hashtagRepository.findOne({ where: { name } });

    if (!hashtag) {
      return [];
    }

    const postHashtags = await this.postHashtagRepository.find({
      where: { hashtagId: hashtag.id },
      take: limit,
      skip: (page - 1) * limit,
      order: { id: 'DESC' },
    });

    const postIds = postHashtags.map((item) => item.postId);
    if (postIds.length === 0) {
      return [];
    }

    const posts = await this.postRepository.find({
      where: { id: In(postIds), status: PostStatus.VISIBLE },
    });

    const postsById = new Map(posts.map((post) => [post.id, post]));
    const orderedPosts = postIds
      .map((id) => postsById.get(id))
      .filter((post): post is Post => Boolean(post));

    return this.postService.enrichPosts(orderedPosts, viewerId);
  }

  async globalSearch(query: string, page = 1, limit = 10): Promise<{
    users: User[];
    hashtags: Hashtag[];
  }> {
    const [users, hashtags] = await Promise.all([
      this.searchUsers(query, page, limit),
      this.searchHashtags(query, page, limit),
    ]);

    return { users, hashtags };
  }

  async getTrendingHashtags(limit = 10): Promise<Hashtag[]> {
    return this.hashtagRepository.find({
      order: { count: 'DESC' },
      take: limit,
    });
  }
}
