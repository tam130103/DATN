import { Injectable, NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource, Not } from 'typeorm';
import { User, UserProvider, UserStatus } from './entities/user.entity';
import { Follow } from './entities/follow.entity';
import { UpdateProfileDto } from './dto/update-profile.dto';
import * as bcrypt from 'bcrypt';
import { assertAllowedCloudinaryUrl } from '../../common/media-validation.util';

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

  static readonly DEFAULT_AVATAR_URL =
    'https://res.cloudinary.com/dctovnwlk/image/upload/v1775806448/datn-social/defaults/default-avatar.jpg';

  async create(data: Partial<User>, options?: { skipAutoFollow?: boolean }): Promise<User> {
    // Set default avatar if not provided
    if (!data.avatarUrl) {
      data.avatarUrl = UserService.DEFAULT_AVATAR_URL;
    }
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
    _avatarUrl?: string,
  ): Promise<User> {
    let user = await this.findByGoogleId(googleId);
    if (!user) {
      const baseUsername = email.split('@')[0].toLowerCase().replace(/[^a-z0-9]/g, '');
      const username = `${baseUsername}_${Math.floor(Math.random() * 10000)}`;

      // Always use our default avatar, ignore Google's profile picture
      user = await this.create({
        googleId,
        email,
        username,
        name,
        provider: UserProvider.GOOGLE,
      });
    } else if (
      !user.avatarUrl ||
      user.avatarUrl.includes('googleusercontent.com')
    ) {
      // Migrate existing Google users to default avatar
      user.avatarUrl = UserService.DEFAULT_AVATAR_URL;
      user = await this.userRepository.save(user);
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

  /** Phase 2: Reuse the Facebook bot user as the AI Assistant */
  async getAssistantBotUserId(): Promise<string> {
    const bot = await this.ensureFacebookBotUser();
    return bot.id;
  }


  async ensureUserFollowsFacebookBot(userId: string): Promise<void> {
    const bot = await this.ensureFacebookBotUser();
    if (bot.id === userId) return;

    const existing = await this.followRepository.findOne({
      where: { followerId: userId, followingId: bot.id },
    });
    if (existing) return;

    await this.dataSource.transaction(async (manager) => {
      const result = await manager
        .createQueryBuilder()
        .insert()
        .into(Follow)
        .values({ followerId: userId, followingId: bot.id })
        .orIgnore()
        .returning(['id'])
        .execute();

      if ((result.raw?.length ?? 0) === 0) return;

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
      const result = await manager
        .createQueryBuilder()
        .insert()
        .into(Follow)
        .values(missingIds.map((followerId) => ({ followerId, followingId: bot.id })))
        .orIgnore()
        .returning(['followerId'])
        .execute();

      const insertedFollowerIds = (result.raw ?? [])
        .map((row: { followerId?: string }) => row.followerId)
        .filter((id: string | undefined): id is string => Boolean(id));
      if (insertedFollowerIds.length === 0) return;

      await manager
        .createQueryBuilder()
        .update(User)
        .set({ followingCount: () => '"followingCount" + 1' })
        .where('id IN (:...ids)', { ids: insertedFollowerIds })
        .execute();

      await manager
        .createQueryBuilder()
        .update(User)
        .set({ followersCount: () => `"followersCount" + ${insertedFollowerIds.length}` })
        .where('id = :id', { id: bot.id })
        .execute();
    });
  }

  async update(userId: string, updateProfileDto: UpdateProfileDto): Promise<User> {
    if (updateProfileDto.avatarUrl) {
      assertAllowedCloudinaryUrl(updateProfileDto.avatarUrl, 'avatar URL');
    }

    await this.userRepository.update(userId, updateProfileDto);
    return this.findById(userId);
  }

  async follow(followerId: string, followingId: string): Promise<void> {
    if (followerId === followingId) {
      throw new ConflictException('Cannot follow yourself');
    }

    const target = await this.userRepository.findOne({ where: { id: followingId } });
    if (!target) {
      throw new NotFoundException('User not found');
    }
    if (target.status !== UserStatus.ACTIVE) {
      throw new BadRequestException('Cannot follow this user');
    }

    await this.dataSource.transaction(async (manager) => {
      const result = await manager
        .createQueryBuilder()
        .insert()
        .into(Follow)
        .values({ followerId, followingId })
        .orIgnore()
        .returning(['id'])
        .execute();

      if ((result.raw?.length ?? 0) === 0) {
        throw new ConflictException('Already following');
      }

      await manager.increment(User, { id: followingId }, 'followersCount', 1);
      await manager.increment(User, { id: followerId }, 'followingCount', 1);
    });
  }

  async unfollow(followerId: string, followingId: string): Promise<void> {
    await this.dataSource.transaction(async (manager) => {
      const result = await manager.delete(Follow, { followerId, followingId });
      if (!result.affected) {
        throw new ConflictException('Not following');
      }

      await manager
        .createQueryBuilder()
        .update(User)
        .set({ followersCount: () => 'GREATEST("followersCount" - 1, 0)' })
        .where('id = :id', { id: followingId })
        .execute();
      await manager
        .createQueryBuilder()
        .update(User)
        .set({ followingCount: () => 'GREATEST("followingCount" - 1, 0)' })
        .where('id = :id', { id: followerId })
        .execute();
    });
  }

  async isFollowing(followerId: string, followingId: string): Promise<boolean> {
    const follow = await this.followRepository.findOne({
      where: { followerId, followingId },
    });
    return !!follow;
  }

  async getFollowers(userId: string, page = 1, limit = 20, currentUserId?: string): Promise<any[]> {
    const follows = await this.followRepository.find({
      where: { followingId: userId },
      order: { createdAt: 'DESC' },
      take: limit,
      skip: (page - 1) * limit,
    });

    const followerIds = follows.map((f) => f.followerId);
    if (followerIds.length === 0) return [];

    const users = await this.userRepository
      .createQueryBuilder('user')
      .where('user.id IN (:...ids)', { ids: followerIds })
      .getMany();

    if (!currentUserId) return users;

    const currentUserFollows = await this.followRepository.find({
      where: { followerId: currentUserId },
      select: ['followingId'],
    });
    const followingSet = new Set(currentUserFollows.map((f) => f.followingId));

    return users.map((u) => ({
      ...u,
      isFollowing: followingSet.has(u.id),
    }));
  }

  async getFollowing(userId: string, page = 1, limit = 20, currentUserId?: string): Promise<any[]> {
    const follows = await this.followRepository.find({
      where: { followerId: userId },
      order: { createdAt: 'DESC' },
      take: limit,
      skip: (page - 1) * limit,
    });

    const followingIds = follows.map((f) => f.followingId);
    if (followingIds.length === 0) return [];

    const users = await this.userRepository
      .createQueryBuilder('user')
      .where('user.id IN (:...ids)', { ids: followingIds })
      .getMany();

    if (!currentUserId) return users;

    const currentUserFollows = await this.followRepository.find({
      where: { followerId: currentUserId },
      select: ['followingId'],
    });
    const followingSet = new Set(currentUserFollows.map((f) => f.followingId));

    return users.map((u) => ({
      ...u,
      isFollowing: followingSet.has(u.id),
    }));
  }

  async updateNotificationSettings(userId: string, notificationEnabled: boolean): Promise<void> {
    await this.userRepository.update(userId, { notificationEnabled });
  }

  /** Remove orphaned follows and recalculate followersCount / followingCount for all users */
  async recalculateFollowCounts(): Promise<{ cleaned: number; updated: number }> {
    // 1. Delete follows where follower or following user no longer exists
    const orphaned = await this.dataSource.query(`
      DELETE FROM "follows"
      WHERE "followerId" NOT IN (SELECT id FROM "users")
         OR "followingId" NOT IN (SELECT id FROM "users")
    `);
    const cleaned = orphaned?.[1] ?? 0;

    // 2. Recalculate followersCount
    await this.dataSource.query(`
      UPDATE "users" SET "followersCount" = sub.cnt
      FROM (
        SELECT "followingId" AS uid, COUNT(*)::int AS cnt
        FROM "follows"
        GROUP BY "followingId"
      ) sub
      WHERE "users".id = sub.uid
    `);

    // 3. Set followersCount = 0 for users with no followers
    await this.dataSource.query(`
      UPDATE "users" SET "followersCount" = 0
      WHERE id NOT IN (SELECT DISTINCT "followingId" FROM "follows")
    `);

    // 4. Recalculate followingCount
    await this.dataSource.query(`
      UPDATE "users" SET "followingCount" = sub.cnt
      FROM (
        SELECT "followerId" AS uid, COUNT(*)::int AS cnt
        FROM "follows"
        GROUP BY "followerId"
      ) sub
      WHERE "users".id = sub.uid
    `);

    // 5. Set followingCount = 0 for users following nobody
    await this.dataSource.query(`
      UPDATE "users" SET "followingCount" = 0
      WHERE id NOT IN (SELECT DISTINCT "followerId" FROM "follows")
    `);

    const users = await this.userRepository.count();
    return { cleaned, updated: users };
  }
}
