import React, { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import { AppShell } from '../components/layout/AppShell';
import { Avatar } from '../components/common/Avatar';
import { StatePanel } from '../components/common/StatePanel';
import { PostLightbox } from '../components/PostLightbox';
import { useAuth } from '../contexts/AuthContext';
import { userService } from '../services/user.service';
import { postService } from '../services/post.service';
import { Post, User } from '../types';

const GridIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="1.6">
    <rect x="3" y="3" width="7" height="7" />
    <rect x="14" y="3" width="7" height="7" />
    <rect x="14" y="14" width="7" height="7" />
    <rect x="3" y="14" width="7" height="7" />
  </svg>
);

const BookmarkIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="1.6">
    <path d="M6 3h12a1 1 0 011 1v17l-7-4-7 4V4a1 1 0 011-1z" />
  </svg>
);

const TagIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="1.6">
    <path d="M3 7l10-4 8 8-4 10-10 4L3 7z" />
    <circle cx="9" cy="9" r="1.5" />
  </svg>
);

const HeartIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" className={className} fill="currentColor">
    <path d="M12 21s-7.6-4.6-9.6-8.4C.4 9.3 2.4 5.9 6 5.5c2-.2 3.4.7 4.1 1.8.7-1.1 2.1-2 4.1-1.8 3.6.4 5.6 3.8 3.6 7.1C19.6 16.4 12 21 12 21z" />
  </svg>
);

const StackIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="1.6">
    <rect x="7" y="7" width="10" height="10" />
    <path d="M4 10V4h6" />
  </svg>
);

const PlayIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" className={className} fill="currentColor">
    <path d="M8 5l11 7-11 7V5z" />
  </svg>
);

const ProfilePage: React.FC = () => {
  const { username } = useParams();
  const { user: currentUser, updateUser } = useAuth();
  const [profile, setProfile] = useState<(User & { isFollowing?: boolean }) | null>(null);
  const [followers, setFollowers] = useState<User[]>([]);
  const [following, setFollowing] = useState<User[]>([]);
  const [activeList, setActiveList] = useState<'followers' | 'following'>('followers');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [draft, setDraft] = useState({ username: '', name: '', bio: '', avatarUrl: '' });
  const [posts, setPosts] = useState<Post[]>([]);
  const [activePost, setActivePost] = useState<Post | null>(null);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);

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
        if (!isActive) return;

        if (!data) {
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

        const [followersResult, followingResult, postsResult] = await Promise.allSettled([
          userService.getFollowers(data.id, 1, 8),
          userService.getFollowing(data.id, 1, 8),
          postService.getPostsByUser(data.id, undefined, 24),
        ]);

        if (!isActive) return;
        setFollowers(followersResult.status === 'fulfilled' ? followersResult.value : []);
        setFollowing(followingResult.status === 'fulfilled' ? followingResult.value : []);
        setPosts(postsResult.status === 'fulfilled' ? postsResult.value.posts : []);
      } catch {
        if (!isActive) return;
        toast.error('Failed to load profile.');
        setProfile(null);
      } finally {
        if (isActive) {
          setIsLoading(false);
        }
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
      return undefined;
    }

    const objectUrl = URL.createObjectURL(avatarFile);
    setAvatarPreview(objectUrl);

    return () => {
      URL.revokeObjectURL(objectUrl);
    };
  }, [avatarFile]);

  const isOwnProfile = currentUser?.id === profile?.id;
  const isFollowing = !!profile?.isFollowing;

  const handleFollowToggle = async () => {
    if (!profile || isOwnProfile) return;

    const originalProfile = profile;
    const originalIsFollowing = !!profile.isFollowing;
    const nextFollowersCount = originalIsFollowing
      ? Math.max(0, profile.followersCount - 1)
      : profile.followersCount + 1;

    setProfile({ ...profile, isFollowing: !originalIsFollowing, followersCount: nextFollowersCount });

    try {
      if (originalIsFollowing) {
        await userService.unfollowUser(profile.id);
      } else {
        await userService.followUser(profile.id);
      }
    } catch {
      setProfile(originalProfile);
      toast.error('Failed to update follow state.');
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
          toast.error('Failed to upload avatar.');
          return;
        } finally {
          setIsUploadingAvatar(false);
        }
      }

      const payload: {
        username?: string;
        name?: string;
        bio?: string;
        avatarUrl?: string;
      } = {
        username: draft.username.trim() || undefined,
        name: draft.name.trim() || undefined,
        bio: draft.bio.trim() || undefined,
      };

      if (avatarUrl) {
        payload.avatarUrl = avatarUrl;
      }

      const updatedProfile = await userService.updateProfile(payload);

      setProfile((previous) => (previous ? { ...previous, ...updatedProfile } : previous));
      updateUser((previous) => (previous ? { ...previous, ...updatedProfile } : previous));
      setDraft({
        username: updatedProfile.username || '',
        name: updatedProfile.name || '',
        bio: updatedProfile.bio || '',
        avatarUrl: updatedProfile.avatarUrl || '',
      });
      setAvatarFile(null);
      setIsEditing(false);
      toast.success('Profile updated.');
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to update profile.');
    } finally {
      setIsSaving(false);
    }
  };

  const asideList = useMemo(() => (activeList === 'followers' ? followers : following), [activeList, followers, following]);

  const aside = profile ? (
    <div className="space-y-6">
      <div className="rounded-[32px] border border-white/70 bg-white/80 p-5 shadow-[0_30px_80px_-50px_rgba(15,23,42,0.45)] backdrop-blur">
        <p className="text-xs uppercase tracking-[0.35em] text-slate-400">Connections</p>
        <div className="mt-4 flex items-center gap-3">
          <button
            type="button"
            onClick={() => setActiveList('followers')}
            className={`rounded-2xl px-4 py-2 text-sm font-semibold transition ${
              activeList === 'followers' ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            Followers
          </button>
          <button
            type="button"
            onClick={() => setActiveList('following')}
            className={`rounded-2xl px-4 py-2 text-sm font-semibold transition ${
              activeList === 'following' ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            Following
          </button>
        </div>

        <div className="mt-4 space-y-3">
          {asideList.length === 0 ? (
            <p className="rounded-2xl bg-slate-50 px-4 py-3 text-sm text-slate-500">No users in this list yet.</p>
          ) : (
            asideList.map((entry) => (
              <Link
                key={entry.id}
                to={entry.username ? `/${entry.username}` : `/${entry.id}`}
                className="flex items-center gap-3 rounded-2xl bg-slate-50 px-4 py-3 transition hover:bg-slate-100"
              >
                <Avatar src={entry.avatarUrl} name={entry.name} username={entry.username} size="md" />
                <div className="min-w-0">
                  <p className="truncate font-semibold text-slate-900">{entry.name || entry.username || 'Member'}</p>
                  <p className="truncate text-sm text-slate-500">{entry.username ? `@${entry.username}` : entry.email}</p>
                </div>
              </Link>
            ))
          )}
        </div>
      </div>
    </div>
  ) : undefined;

  if (isLoading) {
    return (
      <AppShell title="Profile" description="Loading profile details and network state.">
        <StatePanel title="Profile" description="Loading account information." />
      </AppShell>
    );
  }

  if (!profile) {
    return (
      <AppShell title="Profile" description="The requested profile could not be resolved.">
        <StatePanel title="Missing" description="This user could not be found." />
      </AppShell>
    );
  }

  const displayHandle = profile.username || profile.name || 'Profile';
  const displayName = profile.name && profile.name !== profile.username ? profile.name : null;
  const postsWithMedia = posts.filter((post) => (post.media?.length ?? 0) > 0);
  const profileAction = isOwnProfile ? (
    <button
      type="button"
      onClick={() => setIsEditing((prev) => !prev)}
      className="rounded-lg border border-neutral-300 px-4 py-1.5 text-sm font-semibold text-neutral-700 transition hover:bg-neutral-50"
    >
      {isEditing ? 'Close editor' : 'Edit profile'}
    </button>
  ) : (
    <button
      type="button"
      onClick={handleFollowToggle}
      className={`rounded-lg px-4 py-1.5 text-sm font-semibold transition ${
        isFollowing ? 'border border-neutral-300 text-neutral-700 hover:bg-neutral-50' : 'bg-[#0095f6] text-white hover:bg-[#1877f2]'
      }`}
    >
      {isFollowing ? 'Following' : 'Follow'}
    </button>
  );

  return (
    <AppShell
      title={displayHandle}
      description={profile.bio || (profile.username ? `@${profile.username}` : 'Profile overview')}
      aside={aside}
    >
      <section className="border border-neutral-200 bg-white px-4 py-6 sm:px-6 sm:py-8">
        <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:gap-10">
          <div className="flex justify-center sm:justify-start">
            <Avatar
              src={profile.avatarUrl}
              name={profile.name}
              username={profile.username}
              size="xl"
              className="h-32 w-32"
            />
          </div>

          <div className="flex-1 space-y-4">
            <div className="flex flex-wrap items-center gap-4">
              <h2 className="text-xl font-semibold text-neutral-900">{displayHandle}</h2>
              {profileAction}
            </div>

            <div className="flex flex-wrap gap-6 text-sm text-neutral-800">
              <span>
                <strong>{postsWithMedia.length}</strong> posts
              </span>
              <span>
                <strong>{profile.followersCount}</strong> followers
              </span>
              <span>
                <strong>{profile.followingCount}</strong> following
              </span>
            </div>

            <div className="text-sm text-neutral-800">
              {displayName ? <p className="font-semibold">{displayName}</p> : null}
              {profile.bio ? (
                <p className="mt-1 whitespace-pre-line text-neutral-700">{profile.bio}</p>
              ) : (
                <p className="mt-1 text-neutral-500">No bio yet.</p>
              )}
            </div>
          </div>
        </div>
      </section>

      <div className="border-t border-neutral-200 bg-white">
        <div className="flex items-center justify-center gap-8 text-[11px] font-semibold uppercase tracking-[0.35em] text-neutral-500">
          <div className="flex items-center gap-2 border-t-2 border-neutral-900 py-4 text-neutral-900">
            <GridIcon className="h-4 w-4" />
            Posts
          </div>
          {isOwnProfile ? (
            <div className="flex items-center gap-2 py-4 text-neutral-400">
              <BookmarkIcon className="h-4 w-4" />
              Saved
            </div>
          ) : null}
          <div className="flex items-center gap-2 py-4 text-neutral-400">
            <TagIcon className="h-4 w-4" />
            Tagged
          </div>
        </div>
      </div>

      <section className="bg-white">
        {postsWithMedia.length === 0 ? (
          <p className="rounded-xl border border-neutral-200 bg-white px-4 py-6 text-sm text-neutral-500">
            No posts yet.
          </p>
        ) : (
          <div className="grid grid-cols-3 gap-[2px] sm:gap-[6px]">
            {postsWithMedia.map((post) => {
              const cover = post.media?.[0];
              const isVideo = cover?.type === 'VIDEO';
              const hasMultiple = (post.media?.length ?? 0) > 1;

              return (
                <button
                  key={post.id}
                  type="button"
                  onClick={() => setActivePost(post)}
                  className="group relative aspect-square overflow-hidden bg-neutral-100"
                  aria-label="Open post"
                >
                  {cover ? (
                    isVideo ? (
                      <video
                        src={cover.url}
                        muted
                        playsInline
                        preload="metadata"
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <img
                        src={cover.url}
                        alt={post.caption || 'Post media'}
                        className="h-full w-full object-cover"
                      />
                    )
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-xs text-neutral-400">
                      No media
                    </div>
                  )}

                  {hasMultiple ? (
                    <div className="absolute right-2 top-2 text-white drop-shadow">
                      <StackIcon className="h-5 w-5" />
                    </div>
                  ) : isVideo ? (
                    <div className="absolute right-2 top-2 text-white drop-shadow">
                      <PlayIcon className="h-5 w-5" />
                    </div>
                  ) : null}

                  <div className="absolute inset-0 bg-black/40 opacity-0 transition group-hover:opacity-100" />
                  <div className="pointer-events-none absolute inset-0 flex items-center justify-center text-sm font-semibold text-white opacity-0 transition group-hover:opacity-100">
                    <div className="flex items-center gap-2">
                      <HeartIcon className="h-4 w-4" />
                      <span>{post.likesCount ?? 0}</span>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </section>

      {isOwnProfile && isEditing ? (
        <section className="rounded-[32px] border border-white/70 bg-white/82 p-5 shadow-[0_24px_80px_-40px_rgba(15,23,42,0.28)] backdrop-blur lg:p-6">
          <p className="text-xs uppercase tracking-[0.35em] text-slate-400">Editor</p>
          <h3 className="mt-2 text-2xl font-semibold text-slate-900">Refine your public profile</h3>

          <form onSubmit={handleSaveProfile} className="mt-5 grid gap-4 lg:grid-cols-2">
            <label className="space-y-2 text-sm text-slate-600">
              <span className="font-medium text-slate-900">Username</span>
              <input
                value={draft.username}
                onChange={(event) => setDraft((prev) => ({ ...prev, username: event.target.value }))}
                className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none transition focus:border-slate-300 focus:bg-white focus:ring-4 focus:ring-slate-900/5"
              />
            </label>

            <label className="space-y-2 text-sm text-slate-600">
              <span className="font-medium text-slate-900">Display name</span>
              <input
                value={draft.name}
                onChange={(event) => setDraft((prev) => ({ ...prev, name: event.target.value }))}
                className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none transition focus:border-slate-300 focus:bg-white focus:ring-4 focus:ring-slate-900/5"
              />
            </label>

            <label className="space-y-2 text-sm text-slate-600 lg:col-span-2">
              <span className="font-medium text-slate-900">Avatar</span>
              <div className="flex flex-wrap items-center gap-4 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                <Avatar
                  src={avatarPreview || profile.avatarUrl}
                  name={profile.name}
                  username={profile.username}
                  size="lg"
                />
                <div className="flex flex-col gap-2">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(event) => setAvatarFile(event.target.files?.[0] || null)}
                    className="text-sm text-slate-600 file:mr-4 file:rounded-full file:border-0 file:bg-slate-900 file:px-4 file:py-2 file:text-xs file:font-semibold file:text-white hover:file:bg-slate-800"
                  />
                  <p className="text-xs text-slate-500">PNG/JPG, max 5MB.</p>
                </div>
              </div>
            </label>

            <label className="space-y-2 text-sm text-slate-600 lg:col-span-2">
              <span className="font-medium text-slate-900">Bio</span>
              <textarea
                value={draft.bio}
                onChange={(event) => setDraft((prev) => ({ ...prev, bio: event.target.value }))}
                rows={4}
                className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none transition focus:border-slate-300 focus:bg-white focus:ring-4 focus:ring-slate-900/5"
              />
            </label>

            <div className="lg:col-span-2 flex justify-end">
              <button
                type="submit"
                disabled={isSaving || isUploadingAvatar}
                className="rounded-2xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:opacity-60"
              >
                {isSaving || isUploadingAvatar ? 'Saving...' : 'Save changes'}
              </button>
            </div>
          </form>
        </section>
      ) : null}

      {activePost ? <PostLightbox post={activePost} onClose={() => setActivePost(null)} /> : null}
    </AppShell>
  );
};

export default ProfilePage;

