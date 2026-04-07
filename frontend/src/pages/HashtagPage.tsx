import React, { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import { AppShell } from '../components/layout/AppShell';
import { PostCard } from '../components/PostCard';
import { StatePanel } from '../components/common/StatePanel';
import { Hashtag, Post } from '../types';
import { searchService } from '../services/search.service';

const HashIcon = () => (
  <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.9">
    <line x1="4" y1="9" x2="20" y2="9" />
    <line x1="4" y1="15" x2="20" y2="15" />
    <line x1="10" y1="3" x2="8" y2="21" />
    <line x1="16" y1="3" x2="14" y2="21" />
  </svg>
);

const HashtagPage: React.FC = () => {
  const { name } = useParams();
  const [posts, setPosts] = useState<Post[]>([]);
  const [relatedHashtags, setRelatedHashtags] = useState<Hashtag[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!name) return;

    const loadData = async () => {
      setIsLoading(true);
      try {
        const [postResults, trending] = await Promise.all([
          searchService.getHashtagPosts(name),
          searchService.getTrendingHashtags(8),
        ]);
        setPosts(postResults);
        setRelatedHashtags(trending.filter((tag) => tag.name !== name));
      } catch {
        toast.error('Không thể tải hashtag.');
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, [name]);

  const aside = (
    <div className="sticky top-6 space-y-4">
      <div className="surface-card rounded-xl p-5">
        <p className="text-base font-semibold text-[var(--app-text)]">Thống kê hashtag</p>
        <div className="mt-4 grid grid-cols-2 gap-3">
          <div className="rounded-lg bg-[var(--app-bg-soft)] px-3 py-3">
            <p className="text-xs text-[var(--app-muted)]">Bài viết</p>
            <p className="mt-1 text-xl font-semibold text-[var(--app-text)]">{posts.length}</p>
          </div>
          <div className="rounded-lg bg-[var(--app-bg-soft)] px-3 py-3">
            <p className="text-xs text-[var(--app-muted)]">Liên quan</p>
            <p className="mt-1 text-xl font-semibold text-[var(--app-text)]">
              {relatedHashtags.length}
            </p>
          </div>
        </div>
      </div>

      <div className="surface-card rounded-xl p-5">
        <div className="flex items-center gap-2 text-[var(--app-text)]">
          <HashIcon />
          <p className="text-base font-semibold">Hashtag liên quan</p>
        </div>
        <div className="mt-4 space-y-2">
          {relatedHashtags.slice(0, 6).map((tag) => (
            <Link
              key={tag.id}
              to={`/hashtag/${tag.name}`}
              className="block rounded-lg px-3 py-3 transition hover:bg-[var(--app-bg-soft)]"
            >
              <p className="text-sm font-semibold text-[var(--app-text)]">#{tag.name}</p>
              <p className="text-sm text-[var(--app-muted)]">{tag.count} bài viết</p>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );

  return (
    <AppShell
      title={`#${name || 'hashtag'}`}
      description="Xem các bài viết có liên quan đến hashtag."
      action={
        <Link
          to="/explore"
          className="inline-flex min-h-[38px] items-center justify-center rounded-md bg-[var(--app-primary)] px-4 text-sm font-semibold text-white transition hover:bg-[var(--app-primary-strong)]"
        >
          Khám phá thêm
        </Link>
      }
      aside={aside}
    >
      <div className="space-y-4">
        <section className="surface-card rounded-xl p-5">
          <div className="flex items-start gap-4">
            <div className="inline-flex h-14 w-14 items-center justify-center rounded-full border border-[var(--app-border)] bg-[var(--app-bg-soft)] text-[var(--app-muted)]">
              <HashIcon />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--app-muted)]">
                Chủ đề
              </p>
              <h2 className="mt-2 text-2xl font-semibold text-[var(--app-text)]">
                #{name || 'hashtag'}
              </h2>
              <p className="mt-2 text-sm leading-6 text-[var(--app-muted-strong)]">
                Xem tất cả bài viết có gắn thẻ topic này và tham gia vào trò chuyện qua các hashtag liên quan.
              </p>
            </div>
          </div>
        </section>

        {isLoading ? (
          <StatePanel title="Hashtag" description="Đang tải các bài viết từ hashtag này." />
        ) : posts.length === 0 ? (
          <StatePanel title="Yên tĩnh" description={`Chưa có bài viết nào được gắn thẻ #${name}.`} />
        ) : (
          <div className="space-y-4">
            {posts.map((post) => (
              <PostCard
                key={post.id}
                post={post}
                onDeleted={(postId) =>
                  setPosts((prev) => prev.filter((item) => item.id !== postId))
                }
              />
            ))}
          </div>
        )}
      </div>
    </AppShell>
  );
};

export default HashtagPage;
