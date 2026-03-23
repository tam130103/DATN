import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { AppShell } from '../components/layout/AppShell';
import { CreatePost } from '../components/CreatePost';
import { PostCard } from '../components/PostCard';
import { StatePanel } from '../components/common/StatePanel';
import { Post, Hashtag } from '../types';
import { postService } from '../services/post.service';
import { searchService } from '../services/search.service';

const FEED_REFRESH_INTERVAL_MS = 30000;

const FeedPage: React.FC = () => {
  const [posts, setPosts] = useState<Post[]>([]);
  const [trending, setTrending] = useState<Hashtag[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const observerTarget = useRef<HTMLDivElement | null>(null);

  const loadPosts = useCallback(async (cursor?: string, options?: { silent?: boolean; merge?: boolean }) => {
    try {
      if (cursor) {
        setIsLoadingMore(true);
      } else if (!options?.silent) {
        setIsLoading(true);
      }

      const response = await postService.getFeed(cursor);
      setPosts((prev) => {
        if (cursor) {
          const existingIds = new Set(prev.map((post) => post.id));
          return [...prev, ...response.posts.filter((post) => !existingIds.has(post.id))];
        }

        if (options?.merge) {
          const incomingIds = new Set(response.posts.map((post) => post.id));
          return [...response.posts, ...prev.filter((post) => !incomingIds.has(post.id))];
        }

        return response.posts;
      });

      setNextCursor((previousCursor) => {
        if (options?.merge) {
          return previousCursor ?? response.nextCursor;
        }

        return response.nextCursor;
      });
    } catch {
      if (!options?.silent) {
        toast.error('Failed to load feed.');
      }
    } finally {
      if (cursor) {
        setIsLoadingMore(false);
      } else if (!options?.silent) {
        setIsLoading(false);
      }
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
        if (entries[0].isIntersecting && nextCursor && !isLoadingMore) loadPosts(nextCursor);
      },
      { threshold: 0.9 },
    );
    observer.observe(observerTarget.current);
    return () => observer.disconnect();
  }, [isLoadingMore, loadPosts, nextCursor]);

  useEffect(() => {
    const refreshFeed = () => {
      if (document.hidden || isLoadingMore) return;
      void loadPosts(undefined, { silent: true, merge: true });
    };

    const intervalId = window.setInterval(refreshFeed, FEED_REFRESH_INTERVAL_MS);
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        refreshFeed();
      }
    };

    window.addEventListener('focus', refreshFeed);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      window.clearInterval(intervalId);
      window.removeEventListener('focus', refreshFeed);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [isLoadingMore, loadPosts]);

  const aside = (
    <div className="sticky top-8 pt-4">

      {/* Suggestions / Trending */}
      <div className="mt-5">
        <div className="flex items-center justify-between">
          <p className="text-sm font-semibold text-[#8e8e8e]">Trending</p>
          <Link to="/explore" className="text-xs font-semibold text-[#262626]">See All</Link>
        </div>
        <div className="mt-3 space-y-3">
          {trending.length === 0 ? (
            <p className="text-xs text-[#8e8e8e]">No trending hashtags yet.</p>
          ) : (
            trending.map((tag) => (
              <Link key={tag.id} to={`/hashtag/${tag.name}`} className="flex items-center justify-between">
                <span className="text-sm font-medium">#{tag.name}</span>
                <span className="text-xs text-[#8e8e8e]">{tag.count} posts</span>
              </Link>
            ))
          )}
        </div>
      </div>

      {/* Footer */}
      <div className="mt-8">
        <p className="text-[11px] uppercase tracking-wide text-[#c7c7c7]">
          © 2026 DATN Social
        </p>
      </div>
    </div>
  );

  return (
    <AppShell aside={aside}>
      <CreatePost onPostCreated={() => loadPosts()} />

      {isLoading && posts.length === 0 ? (
        <StatePanel title="Feed" description="Loading posts..." />
      ) : posts.length === 0 ? (
        <StatePanel
          title="Welcome"
          description="Follow people or create your first post."
          action={
            <Link to="/explore" className="rounded-lg bg-[#0095f6] px-4 py-2 text-sm font-semibold text-white hover:bg-[#1877f2]">
              Discover
            </Link>
          }
        />
      ) : (
        <div className="space-y-3">
          {posts.map((post) => (
            <PostCard
              key={post.id}
              post={post}
              onDeleted={(postId) => setPosts((prev) => prev.filter((item) => item.id !== postId))}
            />
          ))}
        </div>
      )}

      {isLoadingMore && (
        <div className="py-4 text-center text-sm text-[#8e8e8e]">Loading...</div>
      )}

      {nextCursor ? <div ref={observerTarget} className="h-4" /> : null}
    </AppShell>
  );
};

export default FeedPage;
