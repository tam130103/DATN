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

const FeedPage: React.FC = () => {
  const [posts, setPosts] = useState<Post[]>([]);
  const [trending, setTrending] = useState<Hashtag[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const observerTarget = useRef<HTMLDivElement | null>(null);

  const loadPosts = useCallback(async (cursor?: string) => {
    try {
      cursor ? setIsLoadingMore(true) : setIsLoading(true);
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
        if (entries[0].isIntersecting && nextCursor && !isLoadingMore) loadPosts(nextCursor);
      },
      { threshold: 0.9 },
    );
    observer.observe(observerTarget.current);
    return () => observer.disconnect();
  }, [isLoadingMore, loadPosts, nextCursor]);

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
