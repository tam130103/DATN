import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { userService } from '../services/user.service';
import { User } from '../types';
import toast from 'react-hot-toast';

const ProfilePage: React.FC = () => {
  const { username } = useParams();
  const { user: currentUser } = useAuth();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [isFollowing, setIsFollowing] = useState(false);

  useEffect(() => {
    const fetchProfile = async () => {
      if (!username) return;
      try {
        const data = await userService.getByUsername(username);
        setUser(data);
        setIsFollowing(data?.isFollowing || false);
      } catch {
        toast.error('User not found');
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, [username]);

  const handleFollowToggle = async () => {
    if (!user) return;

    const originalIsFollowing = isFollowing;
    const originalCount = user.followersCount;

    // Optimistic update
    setIsFollowing(!originalIsFollowing);
    setUser({
      ...user,
      followersCount: originalIsFollowing ? originalCount - 1 : originalCount + 1,
    });

    try {
      if (originalIsFollowing) {
        await userService.unfollowUser(user.id);
      } else {
        await userService.followUser(user.id);
      }
    } catch {
      // Revert on error
      setIsFollowing(originalIsFollowing);
      setUser({ ...user, followersCount: originalCount });
      toast.error('Failed to update follow status');
    }
  };

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
  }

  if (!user) {
    return <div className="min-h-screen flex items-center justify-center">User not found</div>;
  }

  const isOwnProfile = currentUser?.id === user.id;

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <h1 className="text-xl font-semibold">Profile</h1>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-6">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center space-x-6">
            {user.avatarUrl ? (
              <img
                src={user.avatarUrl}
                alt={user.name || user.username || 'Avatar'}
                className="w-24 h-24 rounded-full object-cover"
              />
            ) : (
              <div className="w-24 h-24 rounded-full bg-gray-200 flex items-center justify-center">
                <span className="text-3xl text-gray-500">
                  {(user.name || user.username || 'U')[0].toUpperCase()}
                </span>
              </div>
            )}

            <div className="flex-1">
              <h2 className="text-2xl font-semibold">
                {user.username ? `@${user.username}` : 'No username'}
              </h2>
              {user.name && <p className="text-gray-600">{user.name}</p>}
              {user.bio && <p className="text-gray-500 mt-2">{user.bio}</p>}
            </div>
          </div>

          <div className="mt-6 flex items-center space-x-8">
            <div className="text-center">
              <p className="text-2xl font-semibold">{user.followersCount}</p>
              <p className="text-gray-500">Followers</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-semibold">{user.followingCount}</p>
              <p className="text-gray-500">Following</p>
            </div>
          </div>

          {!isOwnProfile && (
            <div className="mt-6">
              <button
                onClick={handleFollowToggle}
                className={`px-6 py-2 rounded-lg font-medium transition-colors ${
                  isFollowing
                    ? 'bg-gray-200 text-gray-800 hover:bg-gray-300'
                    : 'bg-blue-500 text-white hover:bg-blue-600'
                }`}
              >
                {isFollowing ? 'Unfollow' : 'Follow'}
              </button>
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default ProfilePage;
