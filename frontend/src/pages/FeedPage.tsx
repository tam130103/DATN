import React, { useEffect, useState, useCallback, useRef } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { postService } from '../services/post.service';
import { CreatePost } from '../components/CreatePost';
import { PostCard } from '../components/PostCard';
import { NotificationBell } from '../components/NotificationBell';
import { Post } from '../types';
import toast from 'react-hot-toast';

const FeedPage: React.FC = () => {
  const { user, logout, token } = useAuth();
  const [posts, setPosts] = useState<Post[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const observerTarget = useRef<HTMLDivElement>(null);

  const loadPosts = useCallback(async (cursor?: string) => {
    try {
      if (cursor) {
        setIsLoadingMore(true);
      } else {
        setIsLoading(true);
      }

      const response = await postService.getFeed(cursor);
      if (cursor) {
        setPosts((prev) => [...prev, ...response.posts]);
      } else {
        setPosts(response.posts);
      }
      setNextCursor(response.nextCursor);
    } catch {
      toast.error('Failed to load posts');
    } finally {
      setIsLoading(false);
      setIsLoadingMore(false);
    }
  }, []);

  useEffect(() => {
    loadPosts();
  }, [loadPosts]);

  // Infinite scroll
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && nextCursor && !isLoadingMore) {
          loadPosts(nextCursor);
        }
      },
      { threshold: 1.0 },
    );

    const currentTarget = observerTarget.current;
    if (currentTarget) {
      observer.observe(currentTarget);
    }

    return () => {
      if (currentTarget) {
        observer.unobserve(currentTarget);
      }
    };
  }, [nextCursor, isLoadingMore, loadPosts]);

  const handlePostCreated = () => {
    loadPosts();
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <h1 className="text-xl font-semibold">DATN Social</h1>

          <div className="flex items-center space-x-4">
            {user?.username && (
              <Link
                to={`/${user.username}`}
                className="text-blue-500 hover:underline"
              >
                @{user.username}
              </Link>
            )}
            {token && <NotificationBell />}
            <button
              onClick={logout}
              className="px-4 py-2 text-sm bg-gray-100 hover:bg-gray-200 rounded-lg"
            >
              Logout
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-6">
        <CreatePost onPostCreated={handlePostCreated} />

        {isLoading && posts.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-gray-500">Loading posts...</p>
          </div>
        ) : posts.length === 0 ? (
          <div className="bg-white rounded-lg shadow p-6 text-center">
            <p className="text-gray-600">No posts yet. Be the first to share!</p>
          </div>
        ) : (
          <div className="space-y-4">
            {posts.map((post) => (
              <PostCard key={post.id} post={post} />
            ))}
          </div>
        )}

        {isLoadingMore && (
          <div className="text-center py-4">
            <p className="text-gray-500">Loading more...</p>
          </div>
        )}

        {/* Infinite scroll trigger */}
        {nextCursor && <div ref={observerTarget} className="h-4" />}
      </main>
    </div>
  );
};

export default FeedPage;
