import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { AnimatePresence, motion } from 'framer-motion';
import { AppShell } from '../components/layout/AppShell';
import { CreatePost } from '../components/CreatePost';
import { PostCard } from '../components/PostCard';
import { StatePanel } from '../components/common/StatePanel';
import { Post, Hashtag } from '../types';
import { postService } from '../services/post.service';
import { searchService } from '../services/search.service';

const FEED_REFRESH_INTERVAL_MS = 30000;

const PostCardSkeleton = React.memo(({ compact = false }: { compact?: boolean }) => (
  <div className="surface-card rounded-xl p-4">
    <div className="flex items-center gap-3">
      <div className="skeleton h-10 w-10 rounded-full" />
      <div className="flex-1 space-y-2">
        <div className="skeleton h-3 w-32" />
        <div className="skeleton h-2.5 w-20" />
      </div>
    </div>
    <div className={`mt-4 skeleton w-full rounded-lg ${compact ? 'h-16' : 'h-48'}`} />
    {!compact ? (
      <div className="mt-4 space-y-2">
        <div className="skeleton h-3 w-3/4" />
        <div className="skeleton h-3 w-1/2" />
      </div>
    ) : null}
  </div>
));
PostCardSkeleton.displayName = 'PostCardSkeleton';

const FeedPage: React.FC = () => {
  const [posts, setPosts] = useState<Post[]>([]);
  const [trending, setTrending] = useState<Hashtag[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const observerTarget = useRef<HTMLDivElement | null>(null);

  const isRefreshingRef = useRef(false);
  const refreshGenerationRef = useRef(0);
  const initialLoadResolvedRef = useRef(false);

  const loadInitial = useCallback(async () => {
    setIsLoading(true);
    initialLoadResolvedRef.current = false;
    try {
      const response = await postService.getFeed();
      setPosts(response.posts);
      setNextCursor(response.nextCursor);
      initialLoadResolvedRef.current = true;
    } catch {
      toast.error('Không thể tải bảng tin.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  const loadMore = useCallback(async (cursor: string) => {
    if (!initialLoadResolvedRef.current) return;
    setIsLoadingMore(true);
    try {
      const response = await postService.getFeed(cursor);
      setPosts((prev) => {
        const existingIds = new Set(prev.map((post) => post.id));
        return [...prev, ...response.posts.filter((post) => !existingIds.has(post.id))];
      });
      setNextCursor(response.nextCursor);
    } catch {
      toast.error('Không thể tải thêm bài viết.');
    } finally {
      setIsLoadingMore(false);
    }
  }, []);

  const refreshLatest = useCallback(async () => {
    if (isRefreshingRef.current || document.hidden) return;

    isRefreshingRef.current = true;
    const generation = ++refreshGenerationRef.current;

    try {
      const response = await postService.getFeed();
      if (generation !== refreshGenerationRef.current) return;

      setPosts((prev) => {
        const incomingIds = new Set(response.posts.map((post) => post.id));
        return [...response.posts, ...prev.filter((post) => !incomingIds.has(post.id))];
      });
      setNextCursor((previousCursor) => previousCursor ?? response.nextCursor);
    } catch {
      // Silent refresh should not interrupt the reader.
    } finally {
      if (generation === refreshGenerationRef.current) {
        isRefreshingRef.current = false;
      }
    }
  }, []);

  useEffect(() => {
    void loadInitial();
    searchService.getTrendingHashtags(6).then(setTrending).catch(() => toast.error('Khong the tai xu huong.'));
  }, [loadInitial]);

  useEffect(() => {
    if (!observerTarget.current || !nextCursor || isLoadingMore) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && nextCursor && !isLoadingMore) void loadMore(nextCursor);
      },
      { threshold: 0.9 },
    );
    observer.observe(observerTarget.current);
    return () => observer.disconnect();
  }, [isLoadingMore, loadMore, nextCursor]);

  useEffect(() => {
    const intervalId = window.setInterval(refreshLatest, FEED_REFRESH_INTERVAL_MS);
    const handleVisibilityChange = () => {
      if (!document.hidden) void refreshLatest();
    };

    window.addEventListener('focus', refreshLatest);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      window.clearInterval(intervalId);
      window.removeEventListener('focus', refreshLatest);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [refreshLatest]);

  const aside = (
    <div className="sticky top-6 space-y-4">
      <div className="surface-card rounded-xl p-5">
        <div className="flex items-center justify-between gap-3">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--app-muted)]">
            Cập nhật trang chủ
          </p>
          <span className="inline-flex items-center gap-2 rounded-full bg-[var(--app-bg-soft)] px-2.5 py-1 text-[11px] font-semibold text-[var(--app-text)]">
            <span className="status-dot-online" />
            Đang theo dõi
          </span>
        </div>
        <p className="mt-3 text-sm leading-6 text-[var(--app-muted-strong)]">
          Bài viết mới được cập nhật nền mỗi 30 giây khi trang đang mở.
        </p>

        <div className="mt-4 grid grid-cols-2 gap-3">
          <div className="rounded-lg bg-[var(--app-bg-soft)] px-3 py-3">
            <p className="text-xs text-[var(--app-muted)]">Bài viết</p>
            <p className="mt-1 font-mono text-xl font-semibold tabular-nums text-[var(--app-text)]">
              {posts.length}
            </p>
          </div>
          <div className="rounded-lg bg-[var(--app-bg-soft)] px-3 py-3">
            <p className="text-xs text-[var(--app-muted)]">Thịnh hành</p>
            <p className="mt-1 font-mono text-xl font-semibold tabular-nums text-[var(--app-text)]">
              {trending.length}
            </p>
          </div>
        </div>
      </div>

      <div className="surface-card rounded-xl p-5">
        <div className="flex items-center justify-between">
          <p className="text-base font-semibold text-[var(--app-text)]">Thịnh hành</p>
          <Link
            to="/explore"
            className="spring-ease rounded-md text-sm font-semibold text-[var(--app-primary)] hover:text-[var(--app-primary-strong)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--app-primary)]"
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
                className="spring-ease flex items-center gap-3 rounded-lg px-3 py-3 hover:bg-[var(--app-primary-soft)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--app-primary)]"
              >
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[var(--app-primary-soft)] font-mono text-xs font-semibold text-[var(--app-primary)]">
                  {index + 1}
                </span>
                <span className="min-w-0">
                  <span className="block truncate text-sm font-semibold text-[var(--app-text)]">
                    #{tag.name}
                  </span>
                  <span className="mt-0.5 block text-sm text-[var(--app-muted)]">
                    {tag.count} bài viết
                  </span>
                </span>
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
        <CreatePost onPostCreated={() => void loadInitial()} />

        {isLoading && posts.length === 0 ? (
          <div className="space-y-4" aria-label="Đang tải bảng tin">
            <PostCardSkeleton />
            <PostCardSkeleton />
            <PostCardSkeleton />
          </div>
        ) : posts.length === 0 ? (
          <StatePanel
            title="Chào mừng"
            description="Theo dõi mọi người hoặc tạo bài viết đầu tiên của bạn."
            action={
              <Link
                to="/explore"
                className="inline-flex min-h-[38px] items-center justify-center rounded-md bg-[var(--app-primary)] px-4 text-sm font-semibold text-white spring-ease hover:bg-[var(--app-primary-strong)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--app-primary)]"
              >
                Khám phá ngay
              </Link>
            }
          />
        ) : (
          <div className="space-y-4">
            <AnimatePresence initial={false}>
              {posts.map((post, index) => (
                <motion.div
                  key={post.id}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.98 }}
                  transition={{
                    duration: 0.3,
                    delay: Math.min(index * 0.06, 0.3),
                    ease: [0.16, 1, 0.3, 1],
                  }}
                >
                  <PostCard
                    post={post}
                    onDeleted={(postId) => setPosts((prev) => prev.filter((item) => item.id !== postId))}
                  />
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}

        {isLoadingMore ? <PostCardSkeleton compact /> : null}

        {nextCursor ? <div ref={observerTarget} className="h-4" /> : null}
      </div>
    </AppShell>
  );
};

export default FeedPage;
