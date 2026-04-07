import { Injectable, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, ILike, DataSource } from 'typeorm';
import { User, UserStatus } from '../user/entities/user.entity';
import { Post, PostStatus } from '../post/entities/post.entity';
import { Comment, CommentStatus } from '../engagement/entities/comment.entity';
import { Like } from '../engagement/entities/like.entity';
import { Report, ReportStatus } from './entities/report.entity';
import { AdminUserQueryDto } from './dto/admin-user-query.dto';
import { UpdateUserStatusDto } from './dto/update-user-status.dto';
import { ModeratePostDto } from './dto/moderate-post.dto';
import { ModerateCommentDto } from './dto/moderate-comment.dto';
import { CreateReportDto } from './dto/create-report.dto';
import { ReviewReportDto, AdminContentQueryDto } from './dto/review-report.dto';
import { UpdateUserRoleDto } from './dto/update-user-role.dto';

@Injectable()
export class AdminService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(Post)
    private readonly postRepository: Repository<Post>,
    @InjectRepository(Comment)
    private readonly commentRepository: Repository<Comment>,
    @InjectRepository(Like)
    private readonly likeRepository: Repository<Like>,
    @InjectRepository(Report)
    private readonly reportRepository: Repository<Report>,
    private readonly dataSource: DataSource,
  ) {}

  // ─── Dashboard ───────────────────────────────────────────────────────────────

  async getDashboard() {
    const [totalUsers, blockedUsers, totalPosts, hiddenPosts, totalComments, hiddenComments, openReports] =
      await Promise.all([
        this.userRepository.count(),
        this.userRepository.count({ where: { status: UserStatus.BLOCKED } }),
        this.postRepository.count({ where: { status: PostStatus.VISIBLE } }),
        this.postRepository.count({ where: { status: PostStatus.HIDDEN } }),
        this.commentRepository.count({ where: { status: CommentStatus.VISIBLE } }),
        this.commentRepository.count({ where: { status: CommentStatus.HIDDEN } }),
        this.reportRepository.count({ where: { status: ReportStatus.OPEN } }),
      ]);

    const activeUsers = totalUsers - blockedUsers;

    const recentReports = await this.reportRepository.find({
      order: { createdAt: 'DESC' },
      take: 5,
      relations: ['reporter'],
    });

    return {
      stats: {
        totalUsers,
        activeUsers,
        blockedUsers,
        totalPosts,
        hiddenPosts,
        totalComments,
        hiddenComments,
        openReports,
      },
      recentReports,
    };
  }

  // ─── User Management ─────────────────────────────────────────────────────────

  async getUsers(query: AdminUserQueryDto) {
    const { search, status, role, page = 1, limit = 20 } = query;
    const skip = (page - 1) * limit;

    const qb = this.userRepository.createQueryBuilder('user').orderBy('user.createdAt', 'DESC');

    if (search) {
      qb.andWhere(
        '(user.email ILIKE :search OR user.username ILIKE :search OR user.name ILIKE :search)',
        { search: `%${search}%` },
      );
    }
    if (status) {
      qb.andWhere('user.status = :status', { status });
    }
    if (role) {
      qb.andWhere('user.role = :role', { role });
    }

    const [users, total] = await qb.skip(skip).take(limit).getManyAndCount();

    return {
      users,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async updateUserStatus(id: string, dto: UpdateUserStatusDto, adminId: string) {
    const user = await this.userRepository.findOne({ where: { id } });
    if (!user) throw new NotFoundException('User not found');

    user.status = dto.status;
    if (dto.status === UserStatus.BLOCKED) {
      user.blockedReason = dto.reason ?? null;
      user.blockedAt = new Date();
    } else {
      user.blockedReason = null;
      user.blockedAt = null;
    }

    return this.userRepository.save(user);
  }

  async updateUserRole(id: string, dto: UpdateUserRoleDto, adminId: string) {
    if (id === adminId) {
      throw new ForbiddenException('Không thể thay đổi vai trò của chính mình');
    }
    const user = await this.userRepository.findOne({ where: { id } });
    if (!user) throw new NotFoundException('User not found');
    if (user.role === 'system') {
      throw new ForbiddenException('Không thể thay đổi vai trò của tài khoản hệ thống');
    }
    user.role = dto.role as any;
    return this.userRepository.save(user);
  }

  // ─── Post Moderation ─────────────────────────────────────────────────────────

  async getPosts(query: AdminContentQueryDto) {
    const { status, page = 1, limit = 20 } = query;
    const skip = (page - 1) * limit;

    const where: any = {};
    if (status) where.status = status;

    const qb = this.postRepository
      .createQueryBuilder('post')
      .leftJoinAndSelect('post.user', 'user')
      .orderBy('post.createdAt', 'DESC')
      .skip(skip)
      .take(limit);

    if (status) {
      qb.where('post.status = :status', { status });
    }

    const [posts, total] = await qb.getManyAndCount();
    return {
      posts,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async moderatePost(id: string, dto: ModeratePostDto, adminId: string) {
    const post = await this.postRepository.findOne({ where: { id } });
    if (!post) throw new NotFoundException('Post not found');

    post.status = dto.status;
    post.moderationReason = dto.reason ?? null;
    post.moderatedBy = adminId;
    post.moderatedAt = new Date();

    return this.postRepository.save(post);
  }

  async deletePost(id: string) {
    const post = await this.postRepository.findOne({ where: { id } });
    if (!post) throw new NotFoundException('Post not found');

    post.status = PostStatus.DELETED;
    return this.postRepository.save(post);
  }

  // ─── Comment Moderation ───────────────────────────────────────────────────────

  async getComments(query: AdminContentQueryDto) {
    const { status, page = 1, limit = 20 } = query;
    const skip = (page - 1) * limit;

    const qb = this.commentRepository
      .createQueryBuilder('comment')
      .leftJoinAndSelect('comment.user', 'user')
      .leftJoinAndSelect('comment.post', 'post')
      .orderBy('comment.createdAt', 'DESC')
      .skip(skip)
      .take(limit);

    if (status) {
      qb.where('comment.status = :status', { status });
    }

    const [comments, total] = await qb.getManyAndCount();
    return {
      comments,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async moderateComment(id: string, dto: ModerateCommentDto, adminId: string) {
    const comment = await this.commentRepository.findOne({ where: { id } });
    if (!comment) throw new NotFoundException('Comment not found');

    comment.status = dto.status;
    comment.moderationReason = dto.reason ?? null;
    comment.moderatedBy = adminId;
    comment.moderatedAt = new Date();

    return this.commentRepository.save(comment);
  }

  async deleteComment(id: string) {
    const comment = await this.commentRepository.findOne({ where: { id } });
    if (!comment) throw new NotFoundException('Comment not found');

    comment.status = CommentStatus.DELETED;
    return this.commentRepository.save(comment);
  }

  // ─── Reports ─────────────────────────────────────────────────────────────────

  async createReport(reporterId: string, dto: CreateReportDto) {
    const report = this.reportRepository.create({
      reporterId,
      targetType: dto.targetType,
      targetId: dto.targetId,
      reason: dto.reason,
    });
    return this.reportRepository.save(report);
  }

  async getReports(query: AdminContentQueryDto) {
    const { status, page = 1, limit = 20 } = query;
    const skip = (page - 1) * limit;

    const qb = this.reportRepository
      .createQueryBuilder('report')
      .leftJoinAndSelect('report.reporter', 'reporter')
      .orderBy('report.createdAt', 'DESC')
      .skip(skip)
      .take(limit);

    if (status) {
      qb.where('report.status = :status', { status });
    }

    const [reports, total] = await qb.getManyAndCount();
    return {
      reports,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async reviewReport(id: string, dto: ReviewReportDto, adminId: string) {
    const report = await this.reportRepository.findOne({ where: { id } });
    if (!report) throw new NotFoundException('Report not found');

    report.status = dto.status;
    report.reviewedBy = adminId;
    report.reviewedAt = new Date();

    return this.reportRepository.save(report);
  }
}
