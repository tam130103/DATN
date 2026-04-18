import React, { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import { AppShell } from '../components/layout/AppShell';
import { Avatar } from '../components/common/Avatar';
import { searchService } from '../services/search.service';
import { Hashtag, User } from '../types';

const SearchIcon = ({ className = 'h-5 w-5' }: { className?: string }) => (
  <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="1.9">
    <circle cx="11" cy="11" r="8" />
    <line x1="21" y1="21" x2="16.65" y2="16.65" />
  </svg>
);

const PeopleIcon = () => (
  <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.9">
    <path d="M17 21v-2a4 4 0 00-4-4H7a4 4 0 00-4 4v2" />
    <circle cx="10" cy="7" r="4" />
    <path d="M23 21v-2a4 4 0 00-3-3.87" />
    <path d="M16 3.13a4 4 0 010 7.75" />
  </svg>
);

const HashIcon = () => (
  <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.9">
    <line x1="4" y1="9" x2="20" y2="9" />
    <line x1="4" y1="15" x2="20" y2="15" />
    <line x1="10" y1="3" x2="8" y2="21" />
    <line x1="16" y1="3" x2="14" y2="21" />
  </svg>
);

const searchTips = [
  'Tìm kiếm bằng tên người dùng để truy cập trực tiếp vào hồ sơ.',
  'Dùng hashtag để khám phá các bài viết xoay quanh một sự kiện hoặc chủ đề.',
  'Các xu hướng sẽ cho bạn biết cộng đồng đang quan tâm đến điều gì ngay bây giờ.',
];

const ExplorePage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [users, setUsers] = useState<User[]>([]);
  const [hashtags, setHashtags] = useState<Hashtag[]>([]);
  const [trendingHashtags, setTrendingHashtags] = useState<Hashtag[]>([]);
  const [activeTab, setActiveTab] = useState<'users' | 'hashtags'>('users');
  const [isLoading, setIsLoading] = useState(false);
  const query = searchParams.get('q') || '';

  useEffect(() => {
    searchService.getTrendingHashtags(8).then(setTrendingHashtags).catch(() => undefined);
  }, []);

  useEffect(() => {
    if (!query) {
      setUsers([]);
      setHashtags([]);
      return;
    }

    const run = async () => {
      setIsLoading(true);
      try {
        const [userResults, hashtagResults] = await Promise.all([
          searchService.searchUsers(query),
          searchService.searchHashtags(query),
        ]);
        setUsers(userResults);
        setHashtags(hashtagResults);
        if (userResults.length === 0 && hashtagResults.length > 0) {
          setActiveTab('hashtags');
        } else {
          setActiveTab('users');
        }
      } catch {
        toast.error('Lỗi tìm kiếm.');
      } finally {
        setIsLoading(false);
      }
    };

    run();
  }, [query]);

  const handleSearch = (value: string) => {
    const nextParams = new URLSearchParams(searchParams);
    if (value) nextParams.set('q', value);
    else nextParams.delete('q');
    setSearchParams(nextParams);
  };

  const totalResults = users.length + hashtags.length;
  const resultLabel = useMemo(() => {
    if (!query) return 'Tìm kiếm mọi người hoặc hashtag';
    if (isLoading) return 'Đang tìm kiếm...';
    return `${totalResults} kết quả cho "${query}"`;
  }, [isLoading, query, totalResults]);

  const aside = (
    <div className="sticky top-6 space-y-4">
      <div className="surface-card rounded-xl p-5">
        <p className="text-base font-semibold text-[var(--app-text)]">Mẹo tìm kiếm</p>
        <div className="mt-4 space-y-3">
          {searchTips.map((tip) => (
            <p key={tip} className="text-sm leading-6 text-[var(--app-muted-strong)]">
              {tip}
            </p>
          ))}
        </div>
      </div>

      <div className="surface-card rounded-xl p-5">
        <div className="flex items-center justify-between">
          <p className="text-base font-semibold text-[var(--app-text)]">Đang thịnh hành</p>
          <span className="text-sm text-[var(--app-muted)]">{trendingHashtags.length}</span>
        </div>

        <div className="mt-4 space-y-3">
          {trendingHashtags.slice(0, 5).map((tag, index) => (
            <Link
              key={tag.id}
              to={`/hashtag/${tag.name}`}
              className="block rounded-lg px-3 py-3 transition hover:bg-[var(--app-bg-soft)]"
            >
              <p className="text-xs text-[var(--app-muted)]">Thịnh hành #{index + 1}</p>
              <p className="mt-1 text-sm font-semibold text-[var(--app-text)]">#{tag.name}</p>
              <p className="text-sm text-[var(--app-muted)]">{tag.count} bài viết</p>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );

  return (
    <AppShell
      title="Khám phá"
      description="Khám phá bạn bè, hashtag, và những câu chuyện thú vị."
      action={
        query ? (
          <button
            type="button"
            onClick={() => handleSearch('')}
            className="inline-flex min-h-[38px] items-center justify-center rounded-md border border-[var(--app-border)] bg-[var(--app-surface)] px-4 text-sm font-semibold text-[var(--app-text)] transition hover:bg-[var(--app-bg-soft)]"
          >
            Xóa
          </button>
        ) : (
          <Link
            to="/feed"
            className="inline-flex min-h-[38px] items-center justify-center rounded-md bg-[var(--app-primary)] px-4 text-sm font-semibold text-white transition hover:bg-[var(--app-primary-strong)]"
          >
            Trở về Trang chủ
          </Link>
        )
      }
      aside={aside}
    >
      <div className="space-y-4" data-testid="explore-page">
        <section className="surface-card rounded-xl p-4 sm:p-5">
          <div className="flex items-center gap-3 rounded-lg border border-[var(--app-border)] bg-[var(--app-bg-soft)] px-4 py-3">
            <SearchIcon className="h-5 w-5 text-[var(--app-muted)]" />
            <input
              type="search"
              value={query}
              onChange={(e) => handleSearch(e.target.value)}
              placeholder="Tìm kiếm người dùng, hashtag, hoặc chủ đề"
              className="flex-1 bg-transparent text-sm text-[var(--app-text)]"
            />
          </div>

          <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-[var(--app-muted-strong)]">{resultLabel}</p>
            <div className="flex items-center gap-3 text-xs text-[var(--app-muted)]">
              <span>{users.length} người</span>
              <span>{hashtags.length} hashtag</span>
              <span>{trendingHashtags.length} xu hướng</span>
            </div>
          </div>
        </section>

        {!query ? (
          <section className="grid gap-4 sm:grid-cols-2">
            {trendingHashtags.length === 0 ? (
              <div className="surface-card rounded-xl px-6 py-12 text-center sm:col-span-2">
                <p className="text-lg font-semibold text-[var(--app-text)]">Chưa có xu hướng nào</p>
                <p className="mt-2 text-sm leading-6 text-[var(--app-muted)]">
                  Hãy đăng bài hoặc quay lại sau để xem các chủ đề mới.
                </p>
              </div>
            ) : (
              trendingHashtags.map((tag, index) => (
                <Link
                  key={tag.id}
                  to={`/hashtag/${tag.name}`}
                  className="surface-card rounded-xl p-5 transition hover:-translate-y-0.5 hover:shadow-[0_10px_24px_rgba(0,0,0,0.08)]"
                >
                  <p className="text-xs text-[var(--app-muted)]">Thịnh hành #{index + 1}</p>
                  <h3 className="mt-2 text-lg font-semibold text-[var(--app-text)]">#{tag.name}</h3>
                  <p className="mt-1 text-sm text-[var(--app-muted)]">{tag.count} bài viết</p>
                </Link>
              ))
            )}
          </section>
        ) : (
          <section className="space-y-4">
            <div className="flex flex-wrap gap-2">
              {([
                { key: 'users', label: 'Người dùng', count: users.length, icon: <PeopleIcon /> },
                { key: 'hashtags', label: 'Hashtag', count: hashtags.length, icon: <HashIcon /> },
              ] as const).map((tab) => (
                <button
                  key={tab.key}
                  type="button"
                  onClick={() => setActiveTab(tab.key)}
                  className={`inline-flex min-h-[36px] items-center gap-2 rounded-md px-3 text-sm font-semibold transition ${
                    activeTab === tab.key
                      ? 'bg-[var(--app-text)] text-white'
                      : 'border border-[var(--app-border)] bg-[var(--app-surface)] text-[var(--app-text)] hover:bg-[var(--app-bg-soft)]'
                  }`}
                >
                  {tab.icon}
                  {tab.label}
                  <span className={`rounded-full px-2 py-0.5 text-xs ${activeTab === tab.key ? 'bg-white/15' : 'bg-[var(--app-bg-soft)]'}`}>
                    {tab.count}
                  </span>
                </button>
              ))}
            </div>

            {isLoading ? (
              <div className="surface-card rounded-xl px-6 py-12 text-center">
                <p className="text-sm text-[var(--app-muted)]">Đang tìm kiếm...</p>
              </div>
            ) : activeTab === 'users' ? (
              users.length === 0 ? (
                <div className="surface-card rounded-xl px-6 py-12 text-center">
                  <p className="text-lg font-semibold text-[var(--app-text)]">Không tìm thấy người dùng nào</p>
                  <p className="mt-2 text-sm leading-6 text-[var(--app-muted)]">
                    Hãy thử tên người dùng khác hoặc chuyển sang tìm kiếm hashtag.
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  {users.map((searchUser) => (
                    <Link
                      key={searchUser.id}
                      to={`/${searchUser.username || searchUser.id}`}
                      className="surface-card flex items-center gap-4 rounded-xl px-4 py-4 transition hover:bg-[var(--app-bg-soft)]"
                    >
                      <Avatar
                        src={searchUser.avatarUrl}
                        name={searchUser.name}
                        username={searchUser.username}
                        size="lg"
                        ring
                      />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold text-[var(--app-text)]">
                          {searchUser.username || searchUser.name || 'user'}
                        </p>
                        {searchUser.name && searchUser.username ? (
                          <p className="truncate text-sm text-[var(--app-muted)]">{searchUser.name}</p>
                        ) : null}
                        <p className="mt-1 text-xs text-[var(--app-muted)]">
                          {searchUser.followersCount} người theo dõi | {searchUser.followingCount} đang theo dõi
                        </p>
                      </div>
                    </Link>
                  ))}
                </div>
              )
            ) : hashtags.length === 0 ? (
              <div className="surface-card rounded-xl px-6 py-12 text-center">
                <p className="text-lg font-semibold text-[var(--app-text)]">Không tìm thấy hashtag nào</p>
                <p className="mt-2 text-sm leading-6 text-[var(--app-muted)]">
                  Thử từ khóa ngắn hơn hoặc khám phá hashtag thịnh hành.
                </p>
              </div>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2">
                {hashtags.map((tag) => (
                  <Link
                    key={tag.id}
                    to={`/hashtag/${tag.name}`}
                    className="surface-card rounded-xl p-5 transition hover:-translate-y-0.5 hover:shadow-[0_10px_24px_rgba(0,0,0,0.08)]"
                  >
                    <p className="text-xs text-[var(--app-muted)]">Hashtag</p>
                    <h3 className="mt-2 text-lg font-semibold text-[var(--app-text)]">#{tag.name}</h3>
                    <p className="mt-1 text-sm text-[var(--app-muted)]">{tag.count} bài viết</p>
                  </Link>
                ))}
              </div>
            )}
          </section>
        )}
      </div>
    </AppShell>
  );
};

export default ExplorePage;
