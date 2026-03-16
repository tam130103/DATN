import React, { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import { AppShell } from '../components/layout/AppShell';
import { Avatar } from '../components/common/Avatar';
import { searchService } from '../services/search.service';
import { Hashtag, User } from '../types';

const SearchIcon = () => (
  <svg viewBox="0 0 24 24" className="h-4 w-4 text-[#8e8e8e]" fill="none" stroke="currentColor" strokeWidth="2">
    <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
  </svg>
);

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
    if (!query) { setUsers([]); setHashtags([]); return; }
    const run = async () => {
      setIsLoading(true);
      try {
        const [userResults, hashtagResults] = await Promise.all([
          searchService.searchUsers(query),
          searchService.searchHashtags(query),
        ]);
        setUsers(userResults);
        setHashtags(hashtagResults);
      } catch {
        toast.error('Search failed.');
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

  return (
    <AppShell>
      <div className="mx-auto w-full max-w-[614px]">
        {/* Search Bar */}
        <div className="px-4 pb-4 pt-2">
          <div className="flex items-center gap-2 rounded-lg bg-[#efefef] px-4 py-2.5">
            <SearchIcon />
            <input
              type="search"
              value={query}
              onChange={(e) => handleSearch(e.target.value)}
              placeholder="Search"
              className="flex-1 bg-transparent text-sm outline-none"
            />
          </div>
        </div>

        {/* No query → Trending */}
        {!query && (
          <div className="px-4">
            <h3 className="mb-4 font-semibold text-[#262626]">Trending</h3>
            <div className="space-y-4">
              {trendingHashtags.map((tag) => (
                <Link key={tag.id} to={`/hashtag/${tag.name}`} className="flex items-center gap-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-full bg-[#efefef] text-lg">#</div>
                  <div>
                    <p className="text-sm font-semibold">#{tag.name}</p>
                    <p className="text-xs text-[#8e8e8e]">{tag.count} posts</p>
                  </div>
                </Link>
              ))}
              {trendingHashtags.length === 0 && (
                <p className="text-sm text-[#8e8e8e]">No trending hashtags yet.</p>
              )}
            </div>
          </div>
        )}

        {/* Query → Tabs + Results */}
        {query && (
          <>
            {/* Tabs */}
            <div className="border-b border-[#dbdbdb]">
              <div className="flex">
                {(['users', 'hashtags'] as const).map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    className={`flex-1 border-b-2 py-2.5 text-xs font-semibold uppercase tracking-[1px] transition ${
                      activeTab === tab ? 'border-[#262626] text-[#262626]' : 'border-transparent text-[#8e8e8e]'
                    }`}
                  >
                    {tab}
                  </button>
                ))}
              </div>
            </div>

            {isLoading ? (
              <div className="py-10 text-center text-sm text-[#8e8e8e]">Searching...</div>
            ) : activeTab === 'users' ? (
              <div>
                {users.length === 0 ? (
                  <div className="py-10 text-center text-sm text-[#8e8e8e]">No users found for "{query}"</div>
                ) : (
                  users.map((user) => (
                    <Link key={user.id} to={user.username ? `/${user.username}` : '#'} className="flex items-center gap-3 px-4 py-3 hover:bg-[#fafafa]">
                      <Avatar src={user.avatarUrl} name={user.name} username={user.username} size="md" />
                      <div>
                        <p className="text-sm font-semibold">{user.username || user.name || 'user'}</p>
                        {user.name && user.username && <p className="text-xs text-[#8e8e8e]">{user.name}</p>}
                      </div>
                    </Link>
                  ))
                )}
              </div>
            ) : (
              <div>
                {hashtags.length === 0 ? (
                  <div className="py-10 text-center text-sm text-[#8e8e8e]">No hashtags found for "{query}"</div>
                ) : (
                  hashtags.map((tag) => (
                    <Link key={tag.id} to={`/hashtag/${tag.name}`} className="flex items-center gap-3 px-4 py-3 hover:bg-[#fafafa]">
                      <div className="flex h-11 w-11 items-center justify-center rounded-full bg-[#efefef] font-bold text-[#262626]">#</div>
                      <div>
                        <p className="text-sm font-semibold">#{tag.name}</p>
                        <p className="text-xs text-[#8e8e8e]">{tag.count} posts</p>
                      </div>
                    </Link>
                  ))
                )}
              </div>
            )}
          </>
        )}
      </div>
    </AppShell>
  );
};

export default ExplorePage;
