import { User } from './entities/user.entity';

export type SafeUserProfile = {
  id: string;
  email: string;
  username: string | null;
  name: string | null;
  bio: string | null;
  avatarUrl: string | null;
  followersCount: number;
  followingCount: number;
  notificationEnabled: boolean;
  role: string;
  status: string;
  createdAt: Date;
  updatedAt: Date;
};

export function toSafeUser(user: User): SafeUserProfile {
  return {
    id: user.id,
    email: user.email,
    username: user.username,
    name: user.name,
    bio: user.bio,
    avatarUrl: user.avatarUrl,
    followersCount: user.followersCount,
    followingCount: user.followingCount,
    notificationEnabled: user.notificationEnabled,
    role: user.role as string,
    status: user.status as string,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  };
}

export function toSafeUserWithFollowing(
  user: User,
  isFollowing: boolean,
): SafeUserProfile & { isFollowing: boolean } {
  return { ...toSafeUser(user), isFollowing };
}