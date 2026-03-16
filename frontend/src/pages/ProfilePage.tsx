import React, { useEffect, useMemo, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { AppShell } from '../components/layout/AppShell';
import { Avatar } from '../components/common/Avatar';
import { PostLightbox } from '../components/PostLightbox';
import { useAuth } from '../contexts/AuthContext';
import { userService } from '../services/user.service';
import { postService } from '../services/post.service';
import { chatService } from '../services/chat.service';
import { Post, User } from '../types';

const GridIcon = () => (
  <svg viewBox="0 0 24 24" className="h-3 w-3" fill="currentColor">
    <rect x="3" y="3" width="7" height="7" />
    <rect x="14" y="3" width="7" height="7" />
    <rect x="14" y="14" width="7" height="7" />
    <rect x="3" y="14" width="7" height="7" />
  </svg>
);

const BookmarkIcon = () => (
  <svg viewBox="0 0 24 24" className="h-3 w-3" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M19 21l-7-5-7 5V5a2 2 0 012-2h10a2 2 0 012 2z" />
  </svg>
);

const TagIcon = () => (
  <svg viewBox="0 0 24 24" className="h-3 w-3" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M20.59 13.41l-7.17 7.17a2 2 0 01-2.83 0L2 12V2h10l8.59 8.59a2 2 0 010 2.82z" />
    <line x1="7" y1="7" x2="7.01" y2="7" />
  </svg>
);

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
  const [activePost, setActivePost] = useState<Post | null>(null);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'posts' | 'saved' | 'tagged'>('posts');

  useEffect(() => {
    let isActive = true;
    if (!username && !currentUser?.id) return () => { isActive = false; };

    const fetchProfile = async () => {
      setIsLoading(true);
      try {
        const data = username ? await userService.getByUsername(username) : await userService.getMe();
        if (!isActive || !data) { setProfile(null); return; }
        setProfile(data);
        setDraft({ username: data.username || '', name: data.name || '', bio: data.bio || '', avatarUrl: data.avatarUrl || '' });

        const [postsResult] = await Promise.allSettled([
          postService.getPostsByUser(data.id, undefined, 24),
        ]);
        if (!isActive) return;
        setPosts(postsResult.status === 'fulfilled' ? postsResult.value.posts : []);
      } catch {
        if (!isActive) return;
        toast.error('Failed to load profile.');
        setProfile(null);
      } finally {
        if (isActive) setIsLoading(false);
      }
    };
    fetchProfile();
    return () => { isActive = false; };
  }, [username, currentUser?.id]);

  useEffect(() => {
    if (!avatarFile) { setAvatarPreview(null); return; }
    const url = URL.createObjectURL(avatarFile);
    setAvatarPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [avatarFile]);

  // Fetch tagged posts when the tab switches to 'tagged'
  useEffect(() => {
    if (activeTab !== 'tagged' || !profile) return;
    let active = true;
    postService.getTaggedPosts(profile.id).then(res => {
      if (active) setTaggedPosts(res.posts);
    }).catch(() => {});
    return () => { active = false; };
  }, [activeTab, profile]);

  const isOwnProfile = currentUser?.id === profile?.id;
  const isFollowing = !!profile?.isFollowing;
  const postsWithMedia = useMemo(() => posts.filter((p) => (p.media?.length ?? 0) > 0), [posts]);

  const handleFollowToggle = async () => {
    if (!profile || isOwnProfile) return;
    const orig = profile;
    const next = !isFollowing;
    setProfile({ ...profile, isFollowing: next, followersCount: next ? profile.followersCount + 1 : Math.max(0, profile.followersCount - 1) });
    try {
      if (!next) await userService.unfollowUser(profile.id);
      else await userService.followUser(profile.id);
    } catch {
      setProfile(orig);
      toast.error('Failed to update follow state.');
    }
  };

  const handleMessage = async () => {
    if (!profile || isOwnProfile) return;
    try {
      const conv = await chatService.createConversation({ participantIds: [profile.id] });
      navigate(`/messages/${conv.id}`);
    } catch (error) {
      toast.error('Failed to start conversation.');
    }
  };

  const handleSaveProfile = async (event: React.FormEvent) => {
    event.preventDefault();
    setIsSaving(true);
    try {
      let avatarUrl: string | undefined;
      if (avatarFile) {
        setIsUploadingAvatar(true);
        try { avatarUrl = await userService.uploadAvatar(avatarFile); }
        catch { toast.error('Failed to upload avatar.'); return; }
        finally { setIsUploadingAvatar(false); }
      }
      const payload: any = { username: draft.username.trim() || undefined, name: draft.name.trim() || undefined, bio: draft.bio.trim() || undefined };
      if (avatarUrl) payload.avatarUrl = avatarUrl;
      const updated = await userService.updateProfile(payload);
      setProfile((prev) => (prev ? { ...prev, ...updated } : prev));
      updateUser((prev) => (prev ? { ...prev, ...updated } : prev));
      setDraft({ username: updated.username || '', name: updated.name || '', bio: updated.bio || '', avatarUrl: updated.avatarUrl || '' });
      setAvatarFile(null);
      setIsEditing(false);
      toast.success('Profile updated.');
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to update profile.');
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <AppShell>
        <div className="flex items-center justify-center py-20">
          <p className="text-sm text-[#8e8e8e]">Loading...</p>
        </div>
      </AppShell>
    );
  }

  if (!profile) {
    return (
      <AppShell>
        <div className="flex items-center justify-center py-20">
          <p className="text-sm text-[#8e8e8e]">User not found.</p>
        </div>
      </AppShell>
    );
  }

  const displayHandle = profile.username || profile.name || 'profile';
  const displayName = profile.name && profile.name !== profile.username ? profile.name : null;

  return (
    <AppShell>
      <div className="max-w-[935px]">
        {/* ── Profile Header ── */}
        <div className="flex flex-col items-center gap-4 px-4 py-6 text-center sm:flex-row sm:items-start sm:gap-8 sm:text-left md:gap-16 md:px-6">
          {/* Avatar */}
          <div className="flex-shrink-0">
            <div className="h-24 w-24 overflow-hidden rounded-full sm:h-[120px] sm:w-[120px] md:h-[150px] md:w-[150px]">
              <Avatar src={profile.avatarUrl} name={profile.name} username={profile.username} size="xl" />
            </div>
          </div>

          {/* Info */}
          <div className="w-full flex-1 space-y-4">
            {/* Username + buttons */}
            <div className="flex flex-wrap items-center justify-center gap-3 sm:justify-start">
              <h2 className="text-xl font-light">{displayHandle}</h2>
              {isOwnProfile ? (
                <>
                  <button
                    onClick={() => setIsEditing(!isEditing)}
                    className="w-full rounded-lg border border-[#dbdbdb] bg-transparent px-4 py-1.5 text-sm font-semibold hover:bg-[#fafafa] sm:w-auto"
                  >
                    Edit profile
                  </button>
                </>
              ) : (
                <>
                  <button
                    onClick={handleFollowToggle}
                    className={`w-full rounded-lg px-4 py-1.5 text-sm font-semibold transition sm:w-auto ${
                      isFollowing
                        ? 'border border-[#dbdbdb] bg-transparent text-[#262626] hover:bg-[#fafafa]'
                        : 'bg-[#0095f6] text-white hover:bg-[#1877f2]'
                    }`}
                  >
                    {isFollowing ? 'Following' : 'Follow'}
                  </button>
                  <button onClick={handleMessage} className="w-full rounded-lg border border-[#dbdbdb] px-4 py-1.5 text-sm font-semibold hover:bg-[#fafafa] sm:w-auto">Message</button>
                </>
              )}
            </div>

            {/* Stats */}
            <div className="flex flex-wrap justify-center gap-4 text-sm sm:justify-start sm:gap-8">
              <span><strong>{postsWithMedia.length}</strong> posts</span>
              <span><strong>{profile.followersCount}</strong> followers</span>
              <span><strong>{profile.followingCount}</strong> following</span>
            </div>

            {/* Name + Bio */}
            <div>
              {displayName && <p className="text-sm font-semibold">{displayName}</p>}
              {profile.bio && <p className="mt-1 whitespace-pre-line text-sm">{profile.bio}</p>}
            </div>
          </div>
        </div>

        {/* ── Edit Form ── */}
        {isOwnProfile && isEditing && (
          <div className="mx-4 mb-6 rounded-lg border border-[#dbdbdb] bg-white p-5">
            <h3 className="mb-4 font-semibold">Edit Profile</h3>
            <form onSubmit={handleSaveProfile} className="space-y-3">
              <div>
                <label className="mb-1 block text-xs font-semibold text-[#8e8e8e]">Username</label>
                <input value={draft.username} onChange={(e) => setDraft((p) => ({ ...p, username: e.target.value }))}
                  className="w-full rounded-sm border border-[#dbdbdb] bg-[#fafafa] px-3 py-2 text-sm outline-none focus:border-[#a8a8a8]" />
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold text-[#8e8e8e]">Name</label>
                <input value={draft.name} onChange={(e) => setDraft((p) => ({ ...p, name: e.target.value }))}
                  className="w-full rounded-sm border border-[#dbdbdb] bg-[#fafafa] px-3 py-2 text-sm outline-none focus:border-[#a8a8a8]" />
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold text-[#8e8e8e]">Bio</label>
                <textarea value={draft.bio} onChange={(e) => setDraft((p) => ({ ...p, bio: e.target.value }))}
                  rows={3} className="w-full resize-none rounded-sm border border-[#dbdbdb] bg-[#fafafa] px-3 py-2 text-sm outline-none focus:border-[#a8a8a8]" />
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold text-[#8e8e8e]">Avatar</label>
                <div className="flex items-center gap-4">
                  <div className="h-10 w-10 overflow-hidden rounded-full">
                    <Avatar src={avatarPreview || profile.avatarUrl} name={profile.name} username={profile.username} size="md" />
                  </div>
                  <input type="file" accept="image/*" onChange={(e) => setAvatarFile(e.target.files?.[0] || null)}
                    className="text-xs text-[#262626]" />
                </div>
              </div>
              <div className="flex gap-2 pt-1">
                <button type="submit" disabled={isSaving || isUploadingAvatar}
                  className="rounded-lg bg-[#0095f6] px-4 py-1.5 text-sm font-semibold text-white disabled:opacity-50">
                  {isSaving || isUploadingAvatar ? 'Saving...' : 'Submit'}
                </button>
                <button type="button" onClick={() => setIsEditing(false)}
                  className="rounded-lg border border-[#dbdbdb] px-4 py-1.5 text-sm font-semibold">Cancel</button>
              </div>
            </form>
          </div>
        )}

        {/* ── Tabs ── */}
        <div className="border-t border-[#dbdbdb]">
          <div className="flex justify-center gap-6 sm:gap-10">
            {[
              { key: 'posts', label: 'Posts', icon: <GridIcon /> },
              ...(isOwnProfile ? [{ key: 'saved', label: 'Saved', icon: <BookmarkIcon /> }] : []),
              { key: 'tagged', label: 'Tagged', icon: <TagIcon /> },
            ].map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key as any)}
                className={`flex items-center gap-1.5 border-t-2 py-3 text-[11px] font-semibold uppercase tracking-[1.5px] transition ${
                  activeTab === tab.key ? 'border-[#262626] text-[#262626]' : 'border-transparent text-[#8e8e8e] hover:text-[#262626]'
                }`}
              >
                {tab.icon}
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* ── Posts Grid ── */}
        <div>
          {activeTab === 'posts' && (
            postsWithMedia.length === 0 ? (
              <div className="flex flex-col items-center py-16 text-center">
                <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full border-2 border-[#262626]">
                  <GridIcon />
                </div>
                <p className="text-2xl font-semibold">No Posts Yet</p>
                {isOwnProfile && (
                  <p className="mt-2 text-sm text-[#8e8e8e]">Share photos and videos to fill your grid.</p>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-3 gap-[3px]">
                {postsWithMedia.map((post) => {
                  const cover = post.media?.[0];
                  return (
                    <button
                      key={post.id}
                      type="button"
                      onClick={() => setActivePost(post)}
                      className="group relative aspect-square overflow-hidden bg-[#fafafa]"
                    >
                      {cover?.type === 'VIDEO' ? (
                        <video src={cover.url} muted playsInline preload="metadata" className="h-full w-full object-cover" />
                      ) : (
                        <img src={cover?.url} alt="" className="h-full w-full object-cover" />
                      )}
                      <div className="absolute inset-0 hidden items-center justify-center gap-4 bg-black/30 text-white group-hover:flex">
                        <span className="flex items-center gap-1 text-sm font-bold">
                          ♥ {post.likesCount ?? 0}
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            )
          )}

          {activeTab === 'tagged' && (
            taggedPosts.length === 0 ? (
              <div className="flex flex-col items-center py-16 text-center">
                <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full border-2 border-[#262626]">
                  <TagIcon />
                </div>
                <p className="text-2xl font-semibold">No Tagged Posts</p>
                <p className="mt-2 text-sm text-[#8e8e8e]">When people tag you in posts, they'll appear here.</p>
              </div>
            ) : (
              <div className="grid grid-cols-3 gap-[3px]">
                {taggedPosts.map((post) => {
                  const cover = post.media?.[0];
                  return (
                    <button
                      key={post.id}
                      type="button"
                      onClick={() => setActivePost(post)}
                      className="group relative aspect-square overflow-hidden bg-[#fafafa]"
                    >
                      {cover?.type === 'VIDEO' ? (
                        <video src={cover.url} muted playsInline preload="metadata" className="h-full w-full object-cover" />
                      ) : cover ? (
                        <img src={cover.url} alt="" className="h-full w-full object-cover" />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center bg-gray-100 p-4 text-xs text-[#8e8e8e]">
                          {post.caption?.slice(0, 80) || 'Text post'}
                        </div>
                      )}
                      <div className="absolute inset-0 hidden items-center justify-center gap-4 bg-black/30 text-white group-hover:flex">
                        <span className="flex items-center gap-1 text-sm font-bold">
                          ♥ {post.likesCount ?? 0}
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            )
          )}
        </div>
      </div>

      {activePost && <PostLightbox post={activePost} onClose={() => setActivePost(null)} />}
    </AppShell>
  );
};

export default ProfilePage;
