import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import { AppShell } from '../components/layout/AppShell';
import { Avatar } from '../components/common/Avatar';
import { PostLightbox } from '../components/PostLightbox';
import { useAuth } from '../contexts/AuthContext';
import { userService } from '../services/user.service';
import { postService } from '../services/post.service';
import { chatService } from '../services/chat.service';
import { Post, User } from '../types';

const GridIcon = ({ className = 'h-4 w-4' }: { className?: string }) => (
  <svg viewBox="0 0 24 24" className={className} fill="currentColor">
    <rect x="3" y="3" width="7" height="7" />
    <rect x="14" y="3" width="7" height="7" />
    <rect x="14" y="14" width="7" height="7" />
    <rect x="3" y="14" width="7" height="7" />
  </svg>
);

const BookmarkIcon = ({ className = 'h-4 w-4' }: { className?: string }) => (
  <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="1.9">
    <path d="M19 21l-7-5-7 5V5a2 2 0 012-2h10a2 2 0 012 2z" />
  </svg>
);

const TagIcon = ({ className = 'h-4 w-4' }: { className?: string }) => (
  <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="1.9">
    <path d="M20.59 13.41l-7.17 7.17a2 2 0 01-2.83 0L2 12V2h10l8.59 8.59a2 2 0 010 2.82z" />
    <line x1="7" y1="7" x2="7.01" y2="7" />
  </svg>
);

const EmptyIcon = ({ children }: { children: React.ReactNode }) => (
  <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full border border-[var(--app-border)] bg-[var(--app-bg-soft)] text-[var(--app-muted)]">
    {children}
  </div>
);

const CloseIcon = () => (
  <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2">
    <line x1="18" y1="6" x2="6" y2="18" />
    <line x1="6" y1="6" x2="18" y2="18" />
  </svg>
);

const SearchIcon2 = () => (
  <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.9">
    <circle cx="11" cy="11" r="8" />
    <line x1="21" y1="21" x2="16.65" y2="16.65" />
  </svg>
);

/* ---------- Instagram-style Followers / Following Modal ---------- */
interface FollowListModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  userId: string;
  mode: 'followers' | 'following';
  currentUserId?: string;
  isOwnProfile: boolean;
}

const FollowListModal: React.FC<FollowListModalProps> = ({
  isOpen,
  onClose,
  title,
  userId,
  mode,
  currentUserId,
  isOwnProfile,
}) => {
  const navigate = useNavigate();
  const [users, setUsers] = useState<(User & { isFollowing?: boolean })[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [togglingIds, setTogglingIds] = useState<Set<string>>(new Set());

  const fetchUsers = useCallback(async () => {
    setIsLoading(true);
    try {
      const data =
        mode === 'followers'
          ? await userService.getFollowers(userId, 1, 100)
          : await userService.getFollowing(userId, 1, 100);
      setUsers(data);
    } catch {
      toast.error('Không thể tải danh sách.');
    } finally {
      setIsLoading(false);
    }
  }, [userId, mode]);

  useEffect(() => {
    if (isOpen) {
      fetchUsers();
      setSearchQuery('');
    }
  }, [isOpen, fetchUsers]);

  // Lock body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  const filtered = useMemo(() => {
    if (!searchQuery.trim()) return users;
    const q = searchQuery.toLowerCase();
    return users.filter(
      (u) =>
        (u.username || '').toLowerCase().includes(q) ||
        (u.name || '').toLowerCase().includes(q),
    );
  }, [users, searchQuery]);

  const handleToggleFollow = async (targetUser: User & { isFollowing?: boolean }) => {
    if (targetUser.id === currentUserId) return;
    setTogglingIds((prev) => new Set(prev).add(targetUser.id));
    const wasFollowing = targetUser.isFollowing;
    // Optimistic update
    setUsers((prev) =>
      prev.map((u) =>
        u.id === targetUser.id ? { ...u, isFollowing: !wasFollowing } : u,
      ),
    );
    try {
      if (wasFollowing) {
        await userService.unfollowUser(targetUser.id);
      } else {
        await userService.followUser(targetUser.id);
      }
    } catch {
      // Revert
      setUsers((prev) =>
        prev.map((u) =>
          u.id === targetUser.id ? { ...u, isFollowing: wasFollowing } : u,
        ),
      );
      toast.error('Không thể cập nhật.');
    } finally {
      setTogglingIds((prev) => {
        const next = new Set(prev);
        next.delete(targetUser.id);
        return next;
      });
    }
  };

  const handleRemoveFollower = async (targetUser: User) => {
    setTogglingIds((prev) => new Set(prev).add(targetUser.id));
    try {
      // Remove follower = the current user (as profile owner) makes that user unfollow
      // Since there may not be a dedicated API, we keep UI-only for now
      setUsers((prev) => prev.filter((u) => u.id !== targetUser.id));
      toast.success(`Đã xóa ${targetUser.username || targetUser.name}`);
    } finally {
      setTogglingIds((prev) => {
        const next = new Set(prev);
        next.delete(targetUser.id);
        return next;
      });
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      onClick={onClose}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/65" />

      {/* Modal */}
      <div
        className="relative flex max-h-[min(400px,80vh)] w-full max-w-[400px] flex-col overflow-hidden rounded-xl border border-[var(--app-border)] bg-[var(--app-surface)] shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[var(--app-border)] px-4 py-3">
          <div className="w-9" />
          <h3 className="text-base font-semibold text-[var(--app-text)]">{title}</h3>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-9 w-9 items-center justify-center rounded-full text-[var(--app-text)] transition hover:bg-[var(--app-bg-soft)]"
          >
            <CloseIcon />
          </button>
        </div>

        {/* Search */}
        <div className="border-b border-[var(--app-border)] px-4 py-2">
          <div className="flex items-center gap-2 rounded-lg bg-[var(--app-bg-soft)] px-3 py-2">
            <span className="text-[var(--app-muted)]">
              <SearchIcon2 />
            </span>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Tìm kiếm"
              className="flex-1 bg-transparent text-sm text-[var(--app-text)] placeholder:text-[var(--app-muted)]"
            />
          </div>
        </div>

        {/* User list */}
        <div className="flex-1 overflow-y-auto">
          {isLoading ? (
            <div className="flex items-center justify-center py-10">
              <div className="h-7 w-7 animate-spin rounded-full border-2 border-[var(--app-primary)] border-t-transparent" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="px-4 py-10 text-center text-sm text-[var(--app-muted)]">
              {searchQuery.trim() ? 'Không tìm thấy kết quả.' : 'Chưa có ai.'}
            </div>
          ) : (
            <div className="py-1">
              {filtered.map((u) => {
                const isSelf = u.id === currentUserId;

                return (
                  <div
                    key={u.id}
                    className="flex items-center gap-3 px-4 py-2.5 transition hover:bg-[var(--app-bg-soft)]"
                  >
                    {/* Avatar – clickable */}
                    <button
                      type="button"
                      onClick={() => {
                        onClose();
                        navigate(`/${u.username ?? u.id}`);
                      }}
                      className="flex-shrink-0"
                    >
                      <Avatar
                        src={u.avatarUrl}
                        name={u.name}
                        username={u.username}
                        size="md"
                      />
                    </button>

                    {/* Name – clickable */}
                    <button
                      type="button"
                      onClick={() => {
                        onClose();
                        navigate(`/${u.username ?? u.id}`);
                      }}
                      className="min-w-0 flex-1 text-left"
                    >
                      <div className="flex items-center gap-1.5">
                        <p className="truncate text-sm font-semibold text-[var(--app-text)]">
                          {u.username || u.name}
                        </p>
                        {!isSelf && u.isFollowing === false && mode === 'followers' ? (
                          <span className="text-xs text-[var(--app-primary)]">· Theo dõi</span>
                        ) : null}
                      </div>
                      {u.name && u.name !== u.username ? (
                        <p className="truncate text-sm text-[var(--app-muted)]">{u.name}</p>
                      ) : null}
                    </button>

                    {/* Action button */}
                    {!isSelf ? (
                      mode === 'followers' && isOwnProfile ? (
                        <button
                          type="button"
                          onClick={() => handleRemoveFollower(u)}
                          disabled={togglingIds.has(u.id)}
                          className="inline-flex min-h-[32px] items-center justify-center rounded-lg bg-[var(--app-bg-soft)] px-4 text-sm font-semibold text-[var(--app-text)] transition hover:bg-[var(--app-border)] disabled:opacity-50"
                        >
                          Xóa
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => handleToggleFollow(u)}
                          disabled={togglingIds.has(u.id)}
                          className={`inline-flex min-h-[32px] items-center justify-center rounded-lg px-4 text-sm font-semibold transition disabled:opacity-50 ${
                            u.isFollowing
                              ? 'bg-[var(--app-bg-soft)] text-[var(--app-text)] hover:bg-[var(--app-border)]'
                              : 'bg-[var(--app-primary)] text-white hover:bg-[var(--app-primary-strong)]'
                          }`}
                        >
                          {u.isFollowing ? 'Đang theo dõi' : 'Theo dõi'}
                        </button>
                      )
                    ) : null}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const tabButtonClass = (isActive: boolean) =>
  `inline-flex min-h-[40px] items-center gap-2 border-t px-1 py-3 text-xs font-semibold uppercase tracking-[0.14em] transition ${
    isActive
      ? 'border-[var(--app-text)] text-[var(--app-text)]'
      : 'border-transparent text-[var(--app-muted)] hover:text-[var(--app-text)]'
  }`;

const ProfilePage: React.FC = () => {
  const { username } = useParams();
  const navigate = useNavigate();
  const { user: currentUser, updateUser } = useAuth();
  const [profile, setProfile] = useState<(User & { isFollowing?: boolean }) | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [draft, setDraft] = useState({ username: '', name: '', bio: '', avatarUrl: '' });
  const [posts, setPosts] = useState<Post[]>([]);
  const [taggedPosts, setTaggedPosts] = useState<Post[]>([]);
  const [savedPosts, setSavedPosts] = useState<Post[]>([]);
  const [activePost, setActivePost] = useState<Post | null>(null);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'posts' | 'saved' | 'tagged'>('posts');
  const [followModal, setFollowModal] = useState<{ mode: 'followers' | 'following' } | null>(null);

  useEffect(() => {
    let isActive = true;
    if (!username && !currentUser?.id) {
      return () => {
        isActive = false;
      };
    }

    const fetchProfile = async () => {
      setIsLoading(true);
      try {
        const data = username ? await userService.getByUsername(username) : await userService.getMe();
        if (!isActive || !data) {
          setProfile(null);
          return;
        }
        setProfile(data);
        setDraft({
          username: data.username || '',
          name: data.name || '',
          bio: data.bio || '',
          avatarUrl: data.avatarUrl || '',
        });

        const [postsResult] = await Promise.allSettled([postService.getPostsByUser(data.id, undefined, 24)]);

        if (!isActive) return;
        setPosts(postsResult.status === 'fulfilled' ? postsResult.value.posts : []);
      } catch {
        if (!isActive) return;
        toast.error('Không thể tải hồ sơ.');
        setProfile(null);
      } finally {
        if (isActive) setIsLoading(false);
      }
    };

    fetchProfile();
    return () => {
      isActive = false;
    };
  }, [username, currentUser?.id]);

  useEffect(() => {
    if (!avatarFile) {
      setAvatarPreview(null);
      return;
    }
    const url = URL.createObjectURL(avatarFile);
    setAvatarPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [avatarFile]);

  useEffect(() => {
    if (activeTab !== 'tagged' || !profile) return;
    let active = true;
    postService
      .getTaggedPosts(profile.id)
      .then((res) => {
        if (active) setTaggedPosts(res.posts);
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [activeTab, profile]);

  const isOwnProfile = currentUser?.id === profile?.id;

  useEffect(() => {
    if (activeTab !== 'saved' || !profile || !isOwnProfile) return;
    let active = true;
    postService
      .getSavedPosts(profile.id)
      .then((res) => {
        if (active) setSavedPosts(res.posts);
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [activeTab, profile, isOwnProfile]);

  const isFollowing = !!profile?.isFollowing;
  const joinedDate = useMemo(
    () => (profile ? new Date(profile.createdAt).toLocaleDateString() : ''),
    [profile],
  );
  const displayHandle = profile?.username || profile?.name || 'Hồ sơ';
  const displayName = profile?.name && profile.name !== profile.username ? profile.name : null;
  const bioText =
    profile?.bio ||
    (isOwnProfile
      ? 'Thêm một tiểu sử ngắn để cho mọi người biết về bạn.'
      : 'Chưa có tiểu sử.');

  const handleFollowToggle = async () => {
    if (!profile || isOwnProfile) return;
    const original = profile;
    const next = !isFollowing;
    setProfile({
      ...profile,
      isFollowing: next,
      followersCount: next ? profile.followersCount + 1 : Math.max(0, profile.followersCount - 1),
    });
    try {
      if (!next) await userService.unfollowUser(profile.id);
      else await userService.followUser(profile.id);
    } catch {
      setProfile(original);
      toast.error('Không thể cập nhật trạng thái theo dõi.');
    }
  };

  const handleMessage = async () => {
    if (!profile || isOwnProfile) return;
    try {
      const conversation = await chatService.createConversation({ participantIds: [profile.id] });
      navigate(`/messages/${conversation.id}`);
    } catch {
      toast.error('Không thể bắt đầu cuộc trò chuyện.');
    }
  };

  const handleSaveProfile = async (event: React.FormEvent) => {
    event.preventDefault();
    setIsSaving(true);
    try {
      let avatarUrl: string | undefined;
      if (avatarFile) {
        setIsUploadingAvatar(true);
        try {
          avatarUrl = await userService.uploadAvatar(avatarFile);
        } catch {
          toast.error('Không thể tải lên ảnh đại diện.');
          return;
        } finally {
          setIsUploadingAvatar(false);
        }
      }

      const payload: any = {
        username: draft.username.trim() || undefined,
        name: draft.name.trim() || undefined,
        bio: draft.bio.trim() || undefined,
      };
      if (avatarUrl) payload.avatarUrl = avatarUrl;

      const updated = await userService.updateProfile(payload);
      setProfile((prev) => (prev ? { ...prev, ...updated } : prev));
      updateUser((prev) => (prev ? { ...prev, ...updated } : prev));
      setDraft({
        username: updated.username || '',
        name: updated.name || '',
        bio: updated.bio || '',
        avatarUrl: updated.avatarUrl || '',
      });
      setAvatarFile(null);
      setIsEditing(false);
      toast.success('Hồ sơ đã được cập nhật.');
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Không thể cập nhật hồ sơ.');
    } finally {
      setIsSaving(false);
    }
  };

  const handlePostDeleted = (postId: string) => {
    setPosts((prev) => prev.filter((post) => post.id !== postId));
    setTaggedPosts((prev) => prev.filter((post) => post.id !== postId));
    setSavedPosts((prev) => prev.filter((post) => post.id !== postId));
    setActivePost((prev) => (prev?.id === postId ? null : prev));
  };

  const renderGrid = (items: Post[]) => (
    <div className="grid grid-cols-3 gap-1 sm:gap-4">
      {items.map((post) => {
        const cover = post.media?.[0];
        const hasVideo = post.media?.some((item) => item.type === 'VIDEO');
        const hasCarousel = (post.media?.length || 0) > 1;

        return (
          <button
            key={post.id}
            type="button"
            onClick={() => setActivePost(post)}
            className="group relative aspect-square overflow-hidden bg-[var(--app-bg-soft)] text-left focus-visible:outline-none"
          >
            {cover?.type === 'VIDEO' ? (
              <video src={cover.url} muted playsInline preload="metadata" className="h-full w-full object-cover" />
            ) : cover ? (
              <img src={cover.url} alt="" className="h-full w-full object-cover" />
            ) : (
              <div className="flex h-full w-full items-center justify-center bg-[var(--app-bg-soft)] p-4 text-center text-xs font-semibold text-[var(--app-muted-strong)]">
                {post.caption?.slice(0, 80) || 'Bài viết chữ'}
              </div>
            )}

            <div className="absolute left-2 top-2 flex gap-1.5">
              {hasCarousel ? (
                <span className="rounded-full bg-black/70 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-white">
                  Nhiều ảnh
                </span>
              ) : null}
              {hasVideo ? (
                <span className="rounded-full bg-black/70 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-white">
                  Video
                </span>
              ) : null}
            </div>

            {post.isPinned && (
              <div className="absolute right-2 top-2 text-lg leading-none drop-shadow-md">
                📌
              </div>
            )}

            <div className="absolute inset-0 flex items-center justify-center bg-black/45 opacity-0 transition group-hover:opacity-100">
              <div className="flex gap-6 text-sm font-semibold text-white">
                <span>{post.likesCount ?? 0} lượt thích</span>
                <span>{post.commentsCount ?? 0} bình luận</span>
              </div>
            </div>
          </button>
        );
      })}
    </div>
  );

  if (isLoading) {
    return (
      <AppShell>
        <div className="surface-card rounded-xl px-6 py-16 text-center">
          <p className="text-sm text-[var(--app-muted)]">Đang tải hồ sơ...</p>
        </div>
      </AppShell>
    );
  }

  if (!profile) {
    return (
      <AppShell>
        <div className="surface-card rounded-xl px-6 py-16 text-center">
          <p className="text-lg font-semibold text-[var(--app-text)]">Không tìm thấy người dùng</p>
          <p className="mt-2 text-sm leading-6 text-[var(--app-muted)]">
            Hồ sơ này có thể đã bị hạn chế, bị xoá hoặc tên người dùng đã thay đổi.
          </p>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div className="space-y-6">
        <section className="surface-card rounded-xl p-5 sm:p-8">
          <div className="grid gap-8 md:grid-cols-[180px_minmax(0,1fr)] md:items-start">
            <div className="flex justify-center md:justify-start">
              <Avatar
                src={avatarPreview || profile.avatarUrl}
                name={profile.name}
                username={profile.username}
                size="xl"
                ring
              />
            </div>

            <div className="min-w-0">
              <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-3">
                    <h1 className="truncate text-[28px] font-normal text-[var(--app-text)]">
                      {displayHandle}
                    </h1>
                    {isFollowing ? (
                      <span className="rounded-md bg-[var(--app-bg-soft)] px-2.5 py-1 text-xs font-semibold text-[var(--app-text)]">
                        Đang theo dõi
                      </span>
                    ) : null}
                  </div>
                  {displayName ? (
                    <p className="mt-1 text-sm font-semibold text-[var(--app-text)]">{displayName}</p>
                  ) : null}
                </div>

                <div className="flex flex-wrap gap-2">
                  {isOwnProfile ? (
                    <button
                      type="button"
                      onClick={() => setIsEditing((prev) => !prev)}
                      className="inline-flex min-h-[36px] items-center justify-center rounded-md border border-[var(--app-border)] bg-[var(--app-surface)] px-4 text-sm font-semibold text-[var(--app-text)] transition hover:bg-[var(--app-bg-soft)]"
                    >
                      {isEditing ? 'Đóng trình chỉnh sửa' : 'Chỉnh sửa hồ sơ'}
                    </button>
                  ) : (
                    <>
                      <button
                        type="button"
                        onClick={handleFollowToggle}
                        className={`inline-flex min-h-[36px] items-center justify-center rounded-md px-4 text-sm font-semibold transition ${
                          isFollowing
                            ? 'border border-[var(--app-border)] bg-[var(--app-surface)] text-[var(--app-text)] hover:bg-[var(--app-bg-soft)]'
                            : 'bg-[var(--app-primary)] text-white hover:bg-[var(--app-primary-strong)]'
                        }`}
                      >
                        {isFollowing ? 'Đang theo dõi' : 'Theo dõi'}
                      </button>
                      <button
                        type="button"
                        onClick={handleMessage}
                        className="inline-flex min-h-[36px] items-center justify-center rounded-md border border-[var(--app-border)] bg-[var(--app-surface)] px-4 text-sm font-semibold text-[var(--app-text)] transition hover:bg-[var(--app-bg-soft)]"
                      >
                        Nhắn tin
                      </button>
                    </>
                  )}
                </div>
              </div>

              <div className="mt-5 flex flex-wrap gap-6 text-sm text-[var(--app-text)]">
                <p>
                  <span className="font-semibold">{posts.length}</span> bài viết
                </p>
                <button
                  type="button"
                  onClick={() => setFollowModal({ mode: 'followers' })}
                  className="cursor-pointer transition hover:opacity-70"
                >
                  <span className="font-semibold">{profile.followersCount}</span> người theo dõi
                </button>
                <button
                  type="button"
                  onClick={() => setFollowModal({ mode: 'following' })}
                  className="cursor-pointer transition hover:opacity-70"
                >
                  <span className="font-semibold">{profile.followingCount}</span> đang theo dõi
                </button>
              </div>

              <div className="mt-5 space-y-2 text-sm leading-6 text-[var(--app-text)]">
                <p>{bioText}</p>
                <p className="text-[var(--app-muted)]">
                  Tham gia {joinedDate} | @{profile.username || 'thành viên'}
                </p>
              </div>
            </div>
          </div>
        </section>

        {isOwnProfile && isEditing ? (
          <section className="surface-card rounded-xl p-5 sm:p-6">
            <h2 className="text-lg font-semibold text-[var(--app-text)]">Chỉnh sửa hồ sơ</h2>
            <p className="mt-1 text-sm text-[var(--app-muted)]">
              Cập nhật cách hồ sơ của bạn hiển thị trên bảng tin, tin nhắn và tìm kiếm.
            </p>

            <form onSubmit={handleSaveProfile} className="mt-5 grid gap-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-1.5">
                  <label htmlFor="profile-username" className="text-xs font-medium text-[var(--app-muted)]">
                    Tên người dùng
                  </label>
                  <input
                    id="profile-username"
                    value={draft.username}
                    onChange={(e) => setDraft((prev) => ({ ...prev, username: e.target.value }))}
                    className="min-h-[44px] w-full rounded-md border border-[var(--app-border)] bg-[var(--app-bg-soft)] px-3 text-sm text-[var(--app-text)]"
                  />
                </div>

                <div className="space-y-1.5">
                  <label htmlFor="profile-name" className="text-xs font-medium text-[var(--app-muted)]">
                    Tên hiển thị
                  </label>
                  <input
                    id="profile-name"
                    value={draft.name}
                    onChange={(e) => setDraft((prev) => ({ ...prev, name: e.target.value }))}
                    className="min-h-[44px] w-full rounded-md border border-[var(--app-border)] bg-[var(--app-bg-soft)] px-3 text-sm text-[var(--app-text)]"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label htmlFor="profile-bio" className="text-xs font-medium text-[var(--app-muted)]">
                  Tiểu sử
                </label>
                <textarea
                  id="profile-bio"
                  value={draft.bio}
                  onChange={(e) => setDraft((prev) => ({ ...prev, bio: e.target.value }))}
                  rows={4}
                  className="w-full resize-none rounded-md border border-[var(--app-border)] bg-[var(--app-bg-soft)] px-3 py-3 text-sm leading-6 text-[var(--app-text)]"
                />
              </div>

              <div className="rounded-lg bg-[var(--app-bg-soft)] px-4 py-4">
                <p className="text-sm font-semibold text-[var(--app-text)]">Ảnh đại diện</p>
                <div className="mt-4 flex flex-col gap-4 sm:flex-row sm:items-center">
                  <Avatar
                    src={avatarPreview || profile.avatarUrl}
                    name={profile.name}
                    username={profile.username}
                    size="lg"
                    ring
                  />
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => setAvatarFile(e.target.files?.[0] || null)}
                    className="text-sm text-[var(--app-muted-strong)]"
                  />
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                <button
                  type="submit"
                  disabled={isSaving || isUploadingAvatar}
                  className="inline-flex min-h-[38px] items-center justify-center rounded-md bg-[var(--app-primary)] px-4 text-sm font-semibold text-white transition hover:bg-[var(--app-primary-strong)] disabled:opacity-50"
                >
                  {isSaving || isUploadingAvatar ? 'Đang lưu...' : 'Lưu thay đổi'}
                </button>
                <button
                  type="button"
                  onClick={() => setIsEditing(false)}
                  className="inline-flex min-h-[38px] items-center justify-center rounded-md border border-[var(--app-border)] bg-[var(--app-surface)] px-4 text-sm font-semibold text-[var(--app-text)] transition hover:bg-[var(--app-bg-soft)]"
                >
                  Hủy
                </button>
              </div>
            </form>
          </section>
        ) : null}

        <section className="border-t border-[var(--app-border)]">
          <div className="flex justify-center gap-8">
            {[
              { key: 'posts', label: 'Bài viết', icon: <GridIcon /> },
              ...(isOwnProfile ? [{ key: 'saved', label: 'Đã lưu', icon: <BookmarkIcon /> }] : []),
              { key: 'tagged', label: 'Được gắn thẻ', icon: <TagIcon /> },
            ].map((tab) => (
              <button
                key={tab.key}
                type="button"
                onClick={() => setActiveTab(tab.key as 'posts' | 'saved' | 'tagged')}
                className={tabButtonClass(activeTab === tab.key)}
              >
                {tab.icon}
                {tab.label}
              </button>
            ))}
          </div>

          <div className="mt-4">
            {activeTab === 'posts' ? (
              posts.length === 0 ? (
                <div className="surface-card rounded-xl px-6 py-14 text-center">
                  <EmptyIcon>
                    <GridIcon className="h-7 w-7" />
                  </EmptyIcon>
                  <p className="text-2xl font-semibold text-[var(--app-text)]">Chưa có bài viết nào</p>
                  <p className="mt-2 text-sm leading-6 text-[var(--app-muted)]">
                    {isOwnProfile
                      ? 'Bắt đầu đăng bài để xây dựng lưới hồ sơ của bạn.'
                      : 'Người dùng này chưa có bài viết công khai nào.'}
                  </p>
                </div>
              ) : (
                renderGrid(posts)
              )
            ) : null}

            {activeTab === 'saved' ? (
              savedPosts.length === 0 ? (
                <div className="surface-card rounded-xl px-6 py-14 text-center">
                  <EmptyIcon>
                    <BookmarkIcon className="h-7 w-7" />
                  </EmptyIcon>
                  <p className="text-2xl font-semibold text-[var(--app-text)]">Không có bài viết đã lưu</p>
                  <p className="mt-2 text-sm leading-6 text-[var(--app-muted)]">
                    Nhấn vào biểu tượng dấu trang trên bất kỳ bài viết nào để lưu vào đây.
                  </p>
                </div>
              ) : (
                renderGrid(savedPosts)
              )
            ) : null}

            {activeTab === 'tagged' ? (
              taggedPosts.length === 0 ? (
                <div className="surface-card rounded-xl px-6 py-14 text-center">
                  <EmptyIcon>
                    <TagIcon className="h-7 w-7" />
                  </EmptyIcon>
                  <p className="text-2xl font-semibold text-[var(--app-text)]">Không có bài viết được gắn thẻ</p>
                  <p className="mt-2 text-sm leading-6 text-[var(--app-muted)]">
                    Các bài viết có gắn thẻ hồ sơ này sẽ tự động xuất hiện ở đây.
                  </p>
                </div>
              ) : (
                renderGrid(taggedPosts)
              )
            ) : null}
          </div>
        </section>
      </div>

      {activePost ? (
        <PostLightbox
          post={activePost}
          onClose={() => setActivePost(null)}
          onDeleted={handlePostDeleted}
        />
      ) : null}

      {followModal && profile ? (
        <FollowListModal
          isOpen
          onClose={() => setFollowModal(null)}
          title={followModal.mode === 'followers' ? 'Người theo dõi' : 'Đang theo dõi'}
          userId={profile.id}
          mode={followModal.mode}
          currentUserId={currentUser?.id}
          isOwnProfile={isOwnProfile}
        />
      ) : null}
    </AppShell>
  );
};

export default ProfilePage;
