import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, ILike } from 'typeorm';
import { Post } from '../post/entities/post.entity';

@Injectable()
export class AiToolsService {
  constructor(
    @InjectRepository(Post)
    private readonly postRepository: Repository<Post>,
  ) {}

  async getPostsCount(): Promise<number> {
    return this.postRepository.count();
  }

  async searchPosts(query: string, limit = 5) {
    if (!query || query.trim().length === 0) {
      return [];
    }

    const posts = await this.postRepository.find({
      where: {
        caption: ILike(`%${query}%`),
      },
      relations: ['user'],
      order: {
        createdAt: 'DESC',
      },
      take: limit,
    });

    return posts.map(p => ({
      id: p.id,
      content: p.caption,
      author: p.user ? (p.user.name || p.user.username) : 'Unknown',
      createdAt: p.createdAt.toISOString(),
    }));
  }
}
