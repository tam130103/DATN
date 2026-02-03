import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { User } from './entities/user.entity';
import { Follow } from './entities/follow.entity';
import { UpdateProfileDto } from './dto/update-profile.dto';

@Injectable()
export class UserService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(Follow)
    private readonly followRepository: Repository<Follow>,
    private readonly dataSource: DataSource,
  ) {}

  async create(data: Partial<User>): Promise<User> {
    const user = this.userRepository.create(data);
    return this.userRepository.save(user);
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
      });
    }
    return user;
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
