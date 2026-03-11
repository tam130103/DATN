import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useAuth } from '../contexts/AuthContext';
import { AppShell } from '../components/layout/AppShell';
import { CreatePost } from '../components/CreatePost';
import { PostCard } from '../components/PostCard';
import { StatePanel } from '../components/common/StatePanel';
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
    <div className="space-y-6">
      <div className="rounded-[32px] border border-white/70 bg-white/80 p-5 shadow-[0_30px_80px_-50px_rgba(15,23,42,0.45)] backdrop-blur">
        <p className="text-xs uppercase tracking-[0.35em] text-slate-400">Momentum</p>
        <h3 className="mt-3 text-2xl font-semibold text-slate-900">Keep the timeline active.</h3>
        <p className="mt-3 text-sm leading-6 text-slate-500">
          Publish progress, reflect on experiments, and stitch conversations together with hashtags so discovery keeps compounding.
        </p>
      </div>

      <div className="rounded-[32px] border border-white/70 bg-white/80 p-5 shadow-[0_30px_80px_-50px_rgba(15,23,42,0.45)] backdrop-blur">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.35em] text-slate-400">Trending</p>
            <h3 className="mt-2 text-xl font-semibold text-slate-900">Hashtag radar</h3>
          </div>
          <Link to="/explore" className="text-sm font-medium text-cyan-700 transition hover:text-cyan-900">
            Explore
          </Link>
        </div>

        <div className="mt-4 space-y-3">
          {trending.length === 0 ? (
            <p className="rounded-2xl bg-slate-50 px-4 py-3 text-sm text-slate-500">Trending tags will appear after activity starts.</p>
          ) : (
            trending.map((tag) => (
              <Link
                key={tag.id}
                to={`/hashtag/${tag.name}`}
                className="flex items-center justify-between rounded-2xl bg-slate-50 px-4 py-3 transition hover:bg-slate-100"
              >
                <div>
                  <p className="font-semibold text-slate-900">#{tag.name}</p>
                  <p className="text-xs uppercase tracking-[0.24em] text-slate-400">Trend signal</p>
                </div>
                <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-slate-600 shadow-sm">
                  {tag.count}
                </span>
              </Link>
            ))
          )}
        </div>
      </div>
    </div>
  );

  return (
    <AppShell
      title="Feed"
      description="Your publishing lane, recent activity, and the people or topics you follow all in one stream."
      action={
        <Link
          to="/explore"
          className="rounded-2xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
        >
          Discover more
        </Link>
      }
      aside={aside}
    >
      <section className="rounded-[32px] border border-white/70 bg-white/82 p-5 shadow-[0_24px_80px_-40px_rgba(15,23,42,0.28)] backdrop-blur lg:p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.35em] text-slate-400">Overview</p>
            <h2 className="mt-2 text-3xl font-semibold tracking-tight text-slate-900">
              {user?.name ? `Welcome back, ${user.name.split(' ')[0]}.` : 'Welcome back.'}
            </h2>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-500">
              Publish a snapshot, review community reactions, and scroll deeper when the next cursor appears.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-3 text-sm text-slate-600">
            <div className="rounded-2xl bg-slate-50 px-4 py-3">
              <p className="text-xs uppercase tracking-[0.25em] text-slate-400">Followers</p>
              <p className="mt-1 text-xl font-semibold text-slate-900">{user?.followersCount ?? 0}</p>
            </div>
            <div className="rounded-2xl bg-slate-50 px-4 py-3">
              <p className="text-xs uppercase tracking-[0.25em] text-slate-400">Following</p>
              <p className="mt-1 text-xl font-semibold text-slate-900">{user?.followingCount ?? 0}</p>
            </div>
          </div>
        </div>
      </section>

      <CreatePost onPostCreated={() => loadPosts()} />

      {isLoading && posts.length === 0 ? (
        <StatePanel title="Feed" description="Loading the latest posts from your network." />
      ) : posts.length === 0 ? (
        <StatePanel
          title="Empty"
          description="Your feed is still quiet. Publish the first update or follow people to start the stream."
          action={
            <Link
              to="/explore"
              className="rounded-2xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
            >
              Open explore
            </Link>
          }
        />
      ) : (
        <div className="space-y-5">
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
        <div className="rounded-[28px] border border-white/70 bg-white/82 px-5 py-4 text-sm text-slate-500 shadow-[0_24px_80px_-40px_rgba(15,23,42,0.28)] backdrop-blur">
          Loading more posts...
        </div>
      ) : null}

      {nextCursor ? <div ref={observerTarget} className="h-4" /> : null}
    </AppShell>
  );
};

export default FeedPage;
