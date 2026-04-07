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
        toast.error('Không thể tải bảng tin.');
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
    <div className="sticky top-6 space-y-4">
      <div className="surface-card rounded-xl p-5">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--app-muted)]">
          CẬP NHẬT TRANG CHỦ
        </p>
        <p className="mt-3 text-sm leading-6 text-[var(--app-muted-strong)]">
          Bài viết mới sẽ được cập nhật liên tục vào bảng tin của bạn mỗi 30 giây.
        </p>

        <div className="mt-4 grid grid-cols-2 gap-3">
          <div className="rounded-lg bg-[var(--app-bg-soft)] px-3 py-3">
            <p className="text-xs text-[var(--app-muted)]">Bài viết</p>
            <p className="mt-1 text-xl font-semibold text-[var(--app-text)]">{posts.length}</p>
          </div>
          <div className="rounded-lg bg-[var(--app-bg-soft)] px-3 py-3">
            <p className="text-xs text-[var(--app-muted)]">Thịnh hành</p>
            <p className="mt-1 text-xl font-semibold text-[var(--app-text)]">{trending.length}</p>
          </div>
        </div>
      </div>

      <div className="surface-card rounded-xl p-5">
        <div className="flex items-center justify-between">
          <p className="text-base font-semibold text-[var(--app-text)]">Thịnh hành</p>
          <Link
            to="/explore"
            className="text-sm font-semibold text-[var(--app-primary)] transition hover:text-[var(--app-primary-strong)]"
          >
            Khám phá
          </Link>
        </div>

        <div className="mt-4 space-y-3">
          {trending.length === 0 ? (
            <p className="text-sm leading-6 text-[var(--app-muted)]">
              Chưa có hashtag nào thịnh hành.
            </p>
          ) : (
            trending.map((tag, index) => (
              <Link
                key={tag.id}
                to={`/hashtag/${tag.name}`}
                className="block rounded-lg px-3 py-3 transition hover:bg-[var(--app-bg-soft)]"
              >
                <p className="text-xs text-[var(--app-muted)]">Thịnh hành #{index + 1}</p>
                <p className="mt-1 text-sm font-semibold text-[var(--app-text)]">#{tag.name}</p>
                <p className="mt-0.5 text-sm text-[var(--app-muted)]">{tag.count} bài viết</p>
              </Link>
            ))
          )}
        </div>
      </div>

      <div className="px-1 text-xs leading-5 text-[var(--app-muted)]">
        DATN Social | Đồ án tốt nghiệp
      </div>
    </div>
  );

  return (
    <AppShell aside={aside}>
      <div className="space-y-4">
        <CreatePost onPostCreated={() => loadPosts()} />

        {isLoading && posts.length === 0 ? (
          <StatePanel title="Bảng tin" description="Đang tải bài viết..." />
        ) : posts.length === 0 ? (
          <StatePanel
            title="Chào mừng"
            description="Theo dõi mọi người hoặc tạo bài viết đầu tiên của bạn."
            action={
              <Link
                to="/explore"
                className="inline-flex min-h-[38px] items-center justify-center rounded-md bg-[var(--app-primary)] px-4 text-sm font-semibold text-white transition hover:bg-[var(--app-primary-strong)]"
              >
                Khám phá ngay
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
          <div className="py-4 text-center text-sm text-[var(--app-muted)]">Đang tải thêm...</div>
        ) : null}

        {nextCursor ? <div ref={observerTarget} className="h-4" /> : null}
      </div>
    </AppShell>
  );
};

export default FeedPage;
