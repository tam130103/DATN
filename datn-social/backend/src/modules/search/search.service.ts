import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../user/entities/user.entity';
import { Hashtag } from './entities/hashtag.entity';
import { Post } from '../post/entities/post.entity';
import { PostHashtag } from '../post/entities/post-hashtag.entity';

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
  ) {}

  async searchUsers(query: string, page = 1, limit = 20): Promise<User[]> {
    return this.userRepository
      .createQueryBuilder('user')
      .where('user.username ILIKE :query', { query: `%${query}%` })
      .orWhere('user.name ILIKE :query', { query: `%${query}%` })
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

  async getHashtagPosts(name: string, page = 1, limit = 20): Promise<Post[]> {
    const hashtag = await this.hashtagRepository.findOne({
      where: { name },
    });

    if (!hashtag) return [];

    const postHashtags = await this.postHashtagRepository.find({
      where: { hashtagId: hashtag.id },
      relations: ['post'],
      take: limit,
      skip: (page - 1) * limit,
      order: { id: 'DESC' },
    });

    return postHashtags.map((ph) => ph.post);
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
