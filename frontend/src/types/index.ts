export type UserRole = 'user' | 'admin' | 'system';
export type UserStatus = 'active' | 'blocked';

export interface User {
  id: string;
  email: string;
  username: string | null;
  name: string | null;
  bio: string | null;
  avatarUrl: string | null;
  followersCount: number;
  followingCount: number;
  notificationEnabled: boolean;
  isFollowing?: boolean;
  createdAt: string;
  role: UserRole;
  status: UserStatus;
  blockedReason?: string | null;
  blockedAt?: string | null;
}

export interface PostMedia {
  id: string;
  url: string;
  type: 'IMAGE' | 'VIDEO';
  orderIndex: number;
}

export interface PostHashtag {
  id: string;
  hashtag: {
    id: string;
    name: string;
  };
}

export interface Post {
  id: string;
  userId: string;
  caption: string;
  createdAt: string;
  user: User;
  media: PostMedia[];
  postHashtags: PostHashtag[];
  liked?: boolean;
  saved?: boolean;
  likesCount?: number;
  commentsCount?: number;
  isPinned?: boolean;
  isEdited?: boolean;
  updatedAt?: string;
}

export interface Comment {
  id: string;
  content: string;
  userId: string;
  postId: string;
  parentId: string | null;
  createdAt: string;
  user: User;
}

export type NotificationType = 'LIKE' | 'COMMENT' | 'FOLLOW';

export interface Notification {
  id: string;
  recipientId: string;
  senderId: string;
  type: NotificationType;
  data?: Record<string, any>;
  isRead: boolean;
  createdAt: string;
  sender: User;
}

export interface Conversation {
  id: string;
  isGroup: boolean;
  name: string | null;
  lastMessage: Message | null;
  members: ConversationMember[];
  updatedAt: string;
}

export interface ConversationMember {
  id: string;
  username: string | null;
  name: string | null;
  avatarUrl: string | null;
}

export interface Message {
  id: string;
  conversationId: string;
  senderId: string;
  content: string;
  mediaUrl: string | null;
  isRead: boolean;
  createdAt: string;
  sender?: User;
}

export interface Hashtag {
  id: string;
  name: string;
  count: number;
  createdAt: string;
}

export interface FeedResponse {
  posts: Post[];
  nextCursor: string | null;
}
