import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ILike, Repository } from 'typeorm';
import { Post, PostStatus } from '../post/entities/post.entity';
import { User, UserStatus } from '../user/entities/user.entity';
import { Comment, CommentStatus } from '../engagement/entities/comment.entity';
import { Like } from '../engagement/entities/like.entity';
import { Hashtag } from '../search/entities/hashtag.entity';
import { Report, ReportStatus, ReportTargetType } from '../admin/entities/report.entity';

type PostSummary = {
  id: string;
  caption: string;
  author: string;
  authorUsername: string | null;
  createdAt: string;
  status: string;
  likesCount?: number;
  commentsCount?: number;
};

@Injectable()
export class AiToolsService {
  constructor(
    @InjectRepository(Post)
    private readonly postRepository: Repository<Post>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(Comment)
    private readonly commentRepository: Repository<Comment>,
    @InjectRepository(Like)
    private readonly likeRepository: Repository<Like>,
    @InjectRepository(Hashtag)
    private readonly hashtagRepository: Repository<Hashtag>,
    @InjectRepository(Report)
    private readonly reportRepository: Repository<Report>,
  ) {}

  async getDashboardStats() {
    const [
      totalUsers,
      blockedUsers,
      totalPosts,
      hiddenPosts,
      totalComments,
      hiddenComments,
      openReports,
    ] = await Promise.all([
      this.userRepository.count(),
      this.userRepository.count({ where: { status: UserStatus.BLOCKED } }),
      this.postRepository.count({ where: { status: PostStatus.VISIBLE } }),
      this.postRepository.count({ where: { status: PostStatus.HIDDEN } }),
      this.commentRepository.count({ where: { status: CommentStatus.VISIBLE } }),
      this.commentRepository.count({ where: { status: CommentStatus.HIDDEN } }),
      this.reportRepository.count({ where: { status: ReportStatus.OPEN } }),
    ]);

    return {
      totalUsers,
      activeUsers: totalUsers - blockedUsers,
      blockedUsers,
      totalPosts,
      hiddenPosts,
      totalComments,
      hiddenComments,
      openReports,
    };
  }

  async getPostsCount(): Promise<number> {
    return this.postRepository.count({ where: { status: PostStatus.VISIBLE } });
  }

  async searchPosts(query: string, limit = 5): Promise<PostSummary[]> {
    if (!query || query.trim().length === 0) {
      return [];
    }

    const posts = await this.postRepository.find({
      where: {
        caption: ILike(`%${query.trim()}%`),
        status: PostStatus.VISIBLE,
      },
      relations: ['user'],
      order: {
        createdAt: 'DESC',
      },
      take: limit,
    });

    return posts.map((post) => this.mapPostSummary(post));
  }

  async getRecentPosts(limit = 5): Promise<PostSummary[]> {
    const posts = await this.postRepository.find({
      where: { status: PostStatus.VISIBLE },
      relations: ['user'],
      order: { createdAt: 'DESC' },
      take: limit,
    });

    return posts.map((post) => this.mapPostSummary(post));
  }

  async getTopPosts(limit = 5): Promise<PostSummary[]> {
    const rows = await this.postRepository
      .createQueryBuilder('post')
      .leftJoin('post.user', 'user')
      .leftJoin(Like, 'post_like', 'post_like.postId = post.id')
      .leftJoin(
        Comment,
        'post_comment',
        'post_comment.postId = post.id AND post_comment.status = :commentStatus',
        { commentStatus: CommentStatus.VISIBLE },
      )
      .where('post.status = :status', { status: PostStatus.VISIBLE })
      .select('post.id', 'id')
      .addSelect('post.caption', 'caption')
      .addSelect('post.createdAt', 'createdAt')
      .addSelect('post.status', 'status')
      .addSelect('user.username', 'authorUsername')
      .addSelect('user.name', 'authorName')
      .addSelect('COUNT(DISTINCT post_like.id)', 'likesCount')
      .addSelect('COUNT(DISTINCT post_comment.id)', 'commentsCount')
      .groupBy('post.id')
      .addGroupBy('user.id')
      .orderBy('COUNT(DISTINCT post_like.id)', 'DESC')
      .addOrderBy('COUNT(DISTINCT post_comment.id)', 'DESC')
      .addOrderBy('post.createdAt', 'DESC')
      .limit(limit)
      .getRawMany();

    return rows.map((row) => ({
      id: row.id,
      caption: row.caption || '',
      author: row.authorName || row.authorUsername || 'Unknown',
      authorUsername: row.authorUsername || null,
      createdAt: new Date(row.createdAt).toISOString(),
      status: row.status,
      likesCount: Number(row.likesCount || 0),
      commentsCount: Number(row.commentsCount || 0),
    }));
  }

  async searchUsers(query: string, limit = 5) {
    if (!query || query.trim().length === 0) {
      return [];
    }

    const users = await this.userRepository
      .createQueryBuilder('user')
      .where(
        '(user.username ILIKE :query OR user.name ILIKE :query OR user.email ILIKE :query)',
        { query: `%${query.trim()}%` },
      )
      .orderBy('user.createdAt', 'DESC')
      .take(limit)
      .getMany();

    return users.map((user) => this.mapUserSummary(user));
  }

  async getUserProfile(idOrUsername: string) {
    const user = await this.findUserByIdentifier(idOrUsername);

    return {
      ...this.mapUserSummary(user),
      bio: user.bio || null,
      avatarUrl: user.avatarUrl || null,
    };
  }

  async getUserStatus(idOrUsername: string) {
    const user = await this.findUserByIdentifier(idOrUsername);

    return {
      id: user.id,
      username: user.username || null,
      name: user.name || null,
      role: user.role,
      status: user.status,
      blockedReason: user.blockedReason || null,
      blockedAt: user.blockedAt ? user.blockedAt.toISOString() : null,
    };
  }

  async searchHashtags(query: string, limit = 5) {
    if (!query || query.trim().length === 0) {
      return [];
    }

    const hashtags = await this.hashtagRepository
      .createQueryBuilder('hashtag')
      .where('hashtag.name ILIKE :query', { query: `${query.trim()}%` })
      .orderBy('hashtag.count', 'DESC')
      .take(limit)
      .getMany();

    return hashtags.map((hashtag) => ({
      id: hashtag.id,
      name: hashtag.name,
      count: hashtag.count,
      createdAt: hashtag.createdAt.toISOString(),
    }));
  }

  async getTrendingHashtags(limit = 5) {
    const hashtags = await this.hashtagRepository.find({
      order: { count: 'DESC' },
      take: limit,
    });

    return hashtags.map((hashtag) => ({
      id: hashtag.id,
      name: hashtag.name,
      count: hashtag.count,
      createdAt: hashtag.createdAt.toISOString(),
    }));
  }

  async getReportedPosts(limit = 5, status?: ReportStatus) {
    const qb = this.reportRepository
      .createQueryBuilder('report')
      .leftJoin(Post, 'post', 'post.id = report.targetId')
      .leftJoin(User, 'user', 'user.id = post.userId')
      .where('report.targetType = :targetType', { targetType: ReportTargetType.POST });

    if (status) {
      qb.andWhere('report.status = :status', { status });
    }

    const rows = await qb
      .select('report.targetId', 'postId')
      .addSelect('post.caption', 'caption')
      .addSelect('post.status', 'postStatus')
      .addSelect('user.username', 'authorUsername')
      .addSelect('user.name', 'authorName')
      .addSelect('COUNT(report.id)', 'reportCount')
      .addSelect('MAX(report.createdAt)', 'latestReportedAt')
      .groupBy('report.targetId')
      .addGroupBy('post.id')
      .addGroupBy('user.id')
      .orderBy('COUNT(report.id)', 'DESC')
      .addOrderBy('MAX(report.createdAt)', 'DESC')
      .limit(limit)
      .getRawMany();

    return rows.map((row) => ({
      postId: row.postId,
      caption: row.caption || '',
      postStatus: row.postStatus || null,
      author: row.authorName || row.authorUsername || 'Unknown',
      authorUsername: row.authorUsername || null,
      reportCount: Number(row.reportCount || 0),
      latestReportedAt: row.latestReportedAt ? new Date(row.latestReportedAt).toISOString() : null,
    }));
  }

  private async findUserByIdentifier(idOrUsername: string) {
    const normalized = idOrUsername.trim();
    const user = this.isUuid(normalized)
      ? await this.userRepository.findOne({
          where: [{ id: normalized }, { username: normalized }],
        })
      : await this.userRepository.findOne({
          where: [{ username: normalized }, { email: normalized }],
        });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return user;
  }

  private mapPostSummary(post: Post): PostSummary {
    return {
      id: post.id,
      caption: post.caption || '',
      author: post.user ? post.user.name || post.user.username || 'Unknown' : 'Unknown',
      authorUsername: post.user?.username || null,
      createdAt: post.createdAt.toISOString(),
      status: post.status,
    };
  }

  private mapUserSummary(user: User) {
    return {
      id: user.id,
      username: user.username || null,
      name: user.name || null,
      email: user.email,
      role: user.role,
      status: user.status,
      followersCount: user.followersCount,
      followingCount: user.followingCount,
      createdAt: user.createdAt.toISOString(),
    };
  }

  private isUuid(value: string) {
    return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
  }
}
