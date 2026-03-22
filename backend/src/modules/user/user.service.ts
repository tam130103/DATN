import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource, Not } from 'typeorm';
import { User, UserProvider } from './entities/user.entity';
import { Follow } from './entities/follow.entity';
import { UpdateProfileDto } from './dto/update-profile.dto';
import * as bcrypt from 'bcrypt';

@Injectable()
export class UserService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(Follow)
    private readonly followRepository: Repository<Follow>,
    private readonly dataSource: DataSource,
    private readonly configService: ConfigService,
  ) {}

  async create(data: Partial<User>, options?: { skipAutoFollow?: boolean }): Promise<User> {
    const user = this.userRepository.create(data);
    const saved = await this.userRepository.save(user);
    if (!options?.skipAutoFollow) {
      await this.ensureUserFollowsFacebookBot(saved.id).catch(() => undefined);
    }
    return saved;
  }

  async findById(id: string): Promise<User> {
    const user = await this.userRepository.findOne({ where: { id } });
    if (!user) {
      throw new NotFoundException('User not found');
    }
    return user;
  }

  async findByEmail(email: string): Promise<User | null> {
    return this.userRepository.findOne({ where: { email } });
  }

  async findByUsername(username: string): Promise<User | null> {
    return this.userRepository.findOne({ where: { username } });
  }

  async findByGoogleId(googleId: string): Promise<User | null> {
    return this.userRepository.findOne({ where: { googleId } });
  }

  async findOrCreateByGoogle(
    googleId: string,
    email: string,
    name: string,
    avatarUrl?: string,
  ): Promise<User> {
    let user = await this.findByGoogleId(googleId);
    if (!user) {
      user = await this.create({
        googleId,
        email,
        name,
        avatarUrl: avatarUrl || null,
        provider: UserProvider.GOOGLE,
      });
    }
    return user;
  }

  async ensureFacebookBotUser(): Promise<User> {
    const botEmail = this.configService.get<string>('FB_BOT_EMAIL', 'fb-bot@datn.local');
    const botUsername = this.configService.get<string>('FB_BOT_USERNAME', 'datn_fb');
    const botName = this.configService.get<string>('FB_BOT_NAME', 'DATN Social');

    let existing = await this.userRepository.findOne({
      where: [{ email: botEmail }, { username: botUsername }],
    });
    if (existing) {
      return existing;
    }

    const rawPassword =
      this.configService.get<string>('FB_BOT_PASSWORD') || `${Date.now()}-${Math.random()}`;
    const hashedPassword = await bcrypt.hash(rawPassword, 10);

    existing = await this.create(
      {
        email: botEmail,
        username: botUsername,
        name: botName,
        password: hashedPassword,
        provider: UserProvider.LOCAL,
        notificationEnabled: false,
      },
      { skipAutoFollow: true },
    );

    return existing;
  }

  async ensureUserFollowsFacebookBot(userId: string): Promise<void> {
    const bot = await this.ensureFacebookBotUser();
    if (bot.id === userId) return;

    const existing = await this.followRepository.findOne({
      where: { followerId: userId, followingId: bot.id },
    });
    if (existing) return;

    await this.dataSource.transaction(async (manager) => {
      await manager.save(Follow, { followerId: userId, followingId: bot.id });
      await manager.increment(User, { id: bot.id }, 'followersCount', 1);
      await manager.increment(User, { id: userId }, 'followingCount', 1);
    });
  }

  async ensureAllUsersFollowFacebookBot(): Promise<void> {
    const bot = await this.ensureFacebookBotUser();
    const users = await this.userRepository.find({
      where: { id: Not(bot.id) },
      select: ['id'],
    });
    if (users.length === 0) return;

    const existing = await this.followRepository.find({
      where: { followingId: bot.id },
      select: ['followerId'],
    });
    const existingIds = new Set(existing.map((f) => f.followerId));
    const missingIds = users.map((u) => u.id).filter((id) => !existingIds.has(id));

    if (missingIds.length === 0) return;

    await this.dataSource.transaction(async (manager) => {
      await manager
        .createQueryBuilder()
        .insert()
        .into(Follow)
        .values(missingIds.map((followerId) => ({ followerId, followingId: bot.id })))
        .orIgnore()
        .execute();

      await manager
        .createQueryBuilder()
        .update(User)
        .set({ followingCount: () => '"followingCount" + 1' })
        .where('id IN (:...ids)', { ids: missingIds })
        .execute();

      await manager
        .createQueryBuilder()
        .update(User)
        .set({ followersCount: () => `"followersCount" + ${missingIds.length}` })
        .where('id = :id', { id: bot.id })
        .execute();
    });
  }

  async update(userId: string, updateProfileDto: UpdateProfileDto): Promise<User> {
    await this.userRepository.update(userId, updateProfileDto);
    return this.findById(userId);
  }

  async follow(followerId: string, followingId: string): Promise<void> {
    if (followerId === followingId) {
      throw new ConflictException('Cannot follow yourself');
    }

    const existing = await this.followRepository.findOne({
      where: { followerId, followingId },
    });

    if (existing) {
      throw new ConflictException('Already following');
    }

    await this.dataSource.transaction(async (manager) => {
      await manager.save(Follow, { followerId, followingId });
      await manager.increment(User, { id: followingId }, 'followersCount', 1);
      await manager.increment(User, { id: followerId }, 'followingCount', 1);
    });
  }

  async unfollow(followerId: string, followingId: string): Promise<void> {
    const follow = await this.followRepository.findOne({
      where: { followerId, followingId },
    });

    if (!follow) {
      throw new ConflictException('Not following');
    }

    await this.dataSource.transaction(async (manager) => {
      await manager.delete(Follow, { followerId, followingId });
      await manager.decrement(User, { id: followingId }, 'followersCount', 1);
      await manager.decrement(User, { id: followerId }, 'followingCount', 1);
    });
  }

  async isFollowing(followerId: string, followingId: string): Promise<boolean> {
    const follow = await this.followRepository.findOne({
      where: { followerId, followingId },
    });
    return !!follow;
  }

  async getFollowers(userId: string, page = 1, limit = 20): Promise<User[]> {
    const follows = await this.followRepository.find({
      where: { followingId: userId },
      order: { createdAt: 'DESC' },
      take: limit,
      skip: (page - 1) * limit,
    });

    const followerIds = follows.map((f) => f.followerId);
    if (followerIds.length === 0) return [];

    return this.userRepository
      .createQueryBuilder('user')
      .where('user.id IN (:...ids)', { ids: followerIds })
      .getMany();
  }

  async getFollowing(userId: string, page = 1, limit = 20): Promise<User[]> {
    const follows = await this.followRepository.find({
      where: { followerId: userId },
      order: { createdAt: 'DESC' },
      take: limit,
      skip: (page - 1) * limit,
    });

    const followingIds = follows.map((f) => f.followingId);
    if (followingIds.length === 0) return [];

    return this.userRepository
      .createQueryBuilder('user')
      .where('user.id IN (:...ids)', { ids: followingIds })
      .getMany();
  }

  async updateNotificationSettings(userId: string, notificationEnabled: boolean): Promise<void> {
    await this.userRepository.update(userId, { notificationEnabled });
  }
}
