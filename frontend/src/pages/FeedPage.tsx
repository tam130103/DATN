import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useAuth } from '../contexts/AuthContext';
import { AppShell } from '../components/layout/AppShell';
import { CreatePost } from '../components/CreatePost';
import { PostCard } from '../components/PostCard';
import { StatePanel } from '../components/common/StatePanel';
import { Avatar } from '../components/common/Avatar';
import { Post, Hashtag } from '../types';
import { postService } from '../services/post.service';
import { searchService } from '../services/search.service';

const FeedPage: React.FC = () => {
  const { user } = useAuth();
  const [posts, setPosts] = useState<Post[]>([]);
  const [trending, setTrending] = useState<Hashtag[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const observerTarget = useRef<HTMLDivElement | null>(null);

  const loadPosts = useCallback(async (cursor?: string) => {
    try {
      if (cursor) {
        setIsLoadingMore(true);
      } else {
        setIsLoading(true);
      }

      const response = await postService.getFeed(cursor);
      setPosts((prev) => (cursor ? [...prev, ...response.posts] : response.posts));
      setNextCursor(response.nextCursor);
    } catch {
      toast.error('Failed to load feed.');
    } finally {
      setIsLoading(false);
      setIsLoadingMore(false);
    }
  }, []);

  useEffect(() => {
    loadPosts();
    searchService.getTrendingHashtags(6).then(setTrending).catch(() => undefined);
  }, [loadPosts]);

  useEffect(() => {
    if (!observerTarget.current || !nextCursor || isLoadingMore) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && nextCursor && !isLoadingMore) {
          loadPosts(nextCursor);
        }
      },
      { threshold: 0.9 },
    );

    observer.observe(observerTarget.current);

    return () => observer.disconnect();
  }, [isLoadingMore, loadPosts, nextCursor]);

  const aside = (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Avatar src={user?.avatarUrl} name={user?.name} username={user?.username} size="sm" />
          <div>
            <p className="text-sm font-semibold text-neutral-900">{user?.username || user?.name || 'You'}</p>
            <p className="text-xs text-neutral-500">{user?.name || user?.email || 'Account'}</p>
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-neutral-200 bg-white p-4">
        <div className="flex items-center justify-between">
          <p className="text-sm font-semibold text-neutral-700">Trending</p>
          <Link to="/explore" className="text-xs font-semibold text-blue-500">
            See all
          </Link>
        </div>
        <div className="mt-3 space-y-3">
          {trending.length === 0 ? (
            <p className="text-xs text-neutral-500">No trending hashtags yet.</p>
          ) : (
            trending.map((tag) => (
              <Link
                key={tag.id}
                to={`/hashtag/${tag.name}`}
                className="flex items-center justify-between text-sm"
              >
                <span className="font-medium text-neutral-800">#{tag.name}</span>
                <span className="text-xs text-neutral-500">{tag.count}</span>
              </Link>
            ))
          )}
        </div>
      </div>
    </div>
  );

  return (
    <AppShell title="Home" description="Recent posts from the people you follow." aside={aside}>
      <CreatePost onPostCreated={() => loadPosts()} />

      {isLoading && posts.length === 0 ? (
        <StatePanel title="Feed" description="Loading the latest posts from your network." />
      ) : posts.length === 0 ? (
        <StatePanel
          title="Empty"
          description="Your feed is quiet. Follow people or create a post to get started."
          action={
            <Link
              to="/explore"
              className="rounded-full bg-blue-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-600"
            >
              Discover accounts
            </Link>
          }
        />
      ) : (
        <div className="space-y-4">
          {posts.map((post) => (
            <PostCard
              key={post.id}
              post={post}
              onDeleted={(postId) => setPosts((prev) => prev.filter((item) => item.id !== postId))}
            />
          ))}
        </div>
      )}

      {isLoadingMore ? (
        <div className="rounded-xl border border-neutral-200 bg-white px-4 py-3 text-sm text-neutral-500">
          Loading more posts...
        </div>
      ) : null}

      {nextCursor ? <div ref={observerTarget} className="h-4" /> : null}
    </AppShell>
  );
};

export default FeedPage;
