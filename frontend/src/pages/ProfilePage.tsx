import React, { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import { AppShell } from '../components/layout/AppShell';
import { Avatar } from '../components/common/Avatar';
import { StatePanel } from '../components/common/StatePanel';
import { useAuth } from '../contexts/AuthContext';
import { userService } from '../services/user.service';
import { User } from '../types';

const ProfilePage: React.FC = () => {
  const { username } = useParams();
  const { user: currentUser, updateUser } = useAuth();
  const [profile, setProfile] = useState<(User & { isFollowing?: boolean }) | null>(null);
  const [followers, setFollowers] = useState<User[]>([]);
  const [following, setFollowing] = useState<User[]>([]);
  const [activeList, setActiveList] = useState<'followers' | 'following'>('followers');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [draft, setDraft] = useState({ username: '', name: '', bio: '', avatarUrl: '' });

  useEffect(() => {
    if (!username) return;

    const fetchProfile = async () => {
      setIsLoading(true);
      try {
        const data = await userService.getByUsername(username);
        setProfile(data);
        setDraft({
          username: data.username || '',
          name: data.name || '',
          bio: data.bio || '',
          avatarUrl: data.avatarUrl || '',
        });

        const [followersData, followingData] = await Promise.all([
          userService.getFollowers(data.id, 1, 8),
          userService.getFollowing(data.id, 1, 8),
        ]);
        setFollowers(followersData);
        setFollowing(followingData);
      } catch {
        toast.error('Failed to load profile.');
        setProfile(null);
      } finally {
        setIsLoading(false);
      }
    };

    fetchProfile();
  }, [username]);

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
      const updatedProfile = await userService.updateProfile({
        username: draft.username.trim() || undefined,
        name: draft.name.trim() || undefined,
        bio: draft.bio.trim() || undefined,
        avatarUrl: draft.avatarUrl.trim() || undefined,
      });

      setProfile((previous) => (previous ? { ...previous, ...updatedProfile } : previous));
      updateUser((previous) => (previous ? { ...previous, ...updatedProfile } : previous));
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
                to={entry.username ? `/${entry.username}` : '/feed'}
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

  return (
    <AppShell
      title={profile.username ? `@${profile.username}` : profile.name || 'Profile'}
      description={profile.bio || 'Profile overview, follow state, and public identity settings.'}
      action={
        isOwnProfile ? (
          <button
            type="button"
            onClick={() => setIsEditing((prev) => !prev)}
            className="rounded-2xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
          >
            {isEditing ? 'Close editor' : 'Edit profile'}
          </button>
        ) : (
          <button
            type="button"
            onClick={handleFollowToggle}
            className={`rounded-2xl px-4 py-3 text-sm font-semibold transition ${
              isFollowing ? 'bg-slate-100 text-slate-700 hover:bg-slate-200' : 'bg-slate-900 text-white hover:bg-slate-800'
            }`}
          >
            {isFollowing ? 'Following' : 'Follow'}
          </button>
        )
      }
      aside={aside}
    >
      <section className="rounded-[32px] border border-white/70 bg-white/82 p-5 shadow-[0_24px_80px_-40px_rgba(15,23,42,0.28)] backdrop-blur lg:p-6">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
          <div className="flex items-center gap-5">
            <Avatar src={profile.avatarUrl} name={profile.name} username={profile.username} size="xl" />
            <div>
              <p className="text-xs uppercase tracking-[0.35em] text-slate-400">Identity</p>
              <h2 className="mt-2 text-3xl font-semibold text-slate-900">{profile.name || profile.username || 'Unnamed user'}</h2>
              <p className="mt-2 text-sm text-slate-500">{profile.username ? `@${profile.username}` : profile.email}</p>
              <p className="mt-4 max-w-2xl text-sm leading-6 text-slate-500">{profile.bio || 'No bio added yet.'}</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 text-sm text-slate-600">
            <div className="rounded-2xl bg-slate-50 px-4 py-3">
              <p className="text-xs uppercase tracking-[0.25em] text-slate-400">Followers</p>
              <p className="mt-1 text-2xl font-semibold text-slate-900">{profile.followersCount}</p>
            </div>
            <div className="rounded-2xl bg-slate-50 px-4 py-3">
              <p className="text-xs uppercase tracking-[0.25em] text-slate-400">Following</p>
              <p className="mt-1 text-2xl font-semibold text-slate-900">{profile.followingCount}</p>
            </div>
          </div>
        </div>
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
              <span className="font-medium text-slate-900">Avatar URL</span>
              <input
                value={draft.avatarUrl}
                onChange={(event) => setDraft((prev) => ({ ...prev, avatarUrl: event.target.value }))}
                placeholder="https://..."
                className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none transition focus:border-slate-300 focus:bg-white focus:ring-4 focus:ring-slate-900/5"
              />
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
                disabled={isSaving}
                className="rounded-2xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:opacity-60"
              >
                {isSaving ? 'Saving...' : 'Save changes'}
              </button>
            </div>
          </form>
        </section>
      ) : null}
    </AppShell>
  );
};

export default ProfilePage;
