import React, { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import { AppShell } from '../components/layout/AppShell';
import { StatePanel } from '../components/common/StatePanel';
import { Avatar } from '../components/common/Avatar';
import { searchService } from '../services/search.service';
import { Hashtag, User } from '../types';

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

    const runSearch = async () => {
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

    runSearch();
  }, [query]);

  const handleSearch = (value: string) => {
    const nextParams = new URLSearchParams(searchParams);
    if (value) {
      nextParams.set('q', value);
    } else {
      nextParams.delete('q');
    }
    setSearchParams(nextParams);
  };

  const aside = (
    <div className="rounded-[32px] border border-white/70 bg-white/80 p-5 shadow-[0_30px_80px_-50px_rgba(15,23,42,0.45)] backdrop-blur">
      <p className="text-xs uppercase tracking-[0.35em] text-slate-400">Discovery radar</p>
      <h3 className="mt-3 text-xl font-semibold text-slate-900">Trending hashtags</h3>
      <div className="mt-4 space-y-3">
        {trendingHashtags.map((tag) => (
          <Link
            key={tag.id}
            to={`/hashtag/${tag.name}`}
            className="flex items-center justify-between rounded-2xl bg-slate-50 px-4 py-3 transition hover:bg-slate-100"
          >
            <div>
              <p className="font-semibold text-slate-900">#{tag.name}</p>
              <p className="text-xs uppercase tracking-[0.24em] text-slate-400">Conversations</p>
            </div>
            <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-slate-600 shadow-sm">
              {tag.count}
            </span>
          </Link>
        ))}
      </div>
    </div>
  );

  return (
    <AppShell
      title="Explore"
      description="Search across people and hashtags, then jump into the streams that are gaining momentum."
      aside={aside}
    >
      <section className="rounded-[32px] border border-white/70 bg-white/82 p-5 shadow-[0_24px_80px_-40px_rgba(15,23,42,0.28)] backdrop-blur lg:p-6">
        <label className="text-xs uppercase tracking-[0.35em] text-slate-400">Search</label>
        <div className="mt-3 flex flex-col gap-3 lg:flex-row">
          <input
            type="text"
            value={query}
            onChange={(event) => handleSearch(event.target.value)}
            placeholder="Search by username, name, or hashtag"
            className="flex-1 rounded-[24px] border border-slate-200 bg-slate-50 px-5 py-4 text-sm outline-none transition focus:border-slate-300 focus:bg-white focus:ring-4 focus:ring-slate-900/5"
          />
          <div className="rounded-[24px] bg-slate-100 px-4 py-4 text-sm text-slate-500">
            {query ? `Results for “${query}”` : 'Start typing to search the workspace.'}
          </div>
        </div>
      </section>

      {!query ? (
        <section className="grid gap-5 lg:grid-cols-2">
          <div className="rounded-[32px] border border-white/70 bg-white/82 p-5 shadow-[0_24px_80px_-40px_rgba(15,23,42,0.28)] backdrop-blur lg:p-6">
            <p className="text-xs uppercase tracking-[0.35em] text-slate-400">Prompt</p>
            <h2 className="mt-3 text-2xl font-semibold text-slate-900">Find your next conversation lane.</h2>
            <p className="mt-3 text-sm leading-6 text-slate-500">
              Search a username to message them directly, or jump into a hashtag stream when you need public context.
            </p>
          </div>

          <div className="rounded-[32px] border border-white/70 bg-white/82 p-5 shadow-[0_24px_80px_-40px_rgba(15,23,42,0.28)] backdrop-blur lg:p-6">
            <p className="text-xs uppercase tracking-[0.35em] text-slate-400">Top hashtags</p>
            <div className="mt-4 flex flex-wrap gap-3">
              {trendingHashtags.slice(0, 6).map((tag) => (
                <Link
                  key={tag.id}
                  to={`/hashtag/${tag.name}`}
                  className="rounded-full bg-cyan-50 px-4 py-2 text-sm font-semibold text-cyan-700 transition hover:bg-cyan-100"
                >
                  #{tag.name}
                </Link>
              ))}
            </div>
          </div>
        </section>
      ) : (
        <section className="rounded-[32px] border border-white/70 bg-white/82 p-5 shadow-[0_24px_80px_-40px_rgba(15,23,42,0.28)] backdrop-blur lg:p-6">
          <div className="mb-5 flex items-center gap-3">
            <button
              type="button"
              onClick={() => setActiveTab('users')}
              className={`rounded-2xl px-4 py-2 text-sm font-semibold transition ${
                activeTab === 'users' ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              Users ({users.length})
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('hashtags')}
              className={`rounded-2xl px-4 py-2 text-sm font-semibold transition ${
                activeTab === 'hashtags' ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              Hashtags ({hashtags.length})
            </button>
          </div>

          {isLoading ? (
            <StatePanel title="Search" description="Searching across users and hashtags." />
          ) : activeTab === 'users' ? (
            users.length === 0 ? (
              <StatePanel title="Users" description="No matching users were found for this query." />
            ) : (
              <div className="space-y-3">
                {users.map((entry) => (
                  <Link
                    key={entry.id}
                    to={entry.username ? `/${entry.username}` : '/feed'}
                    className="flex items-center gap-4 rounded-[28px] border border-slate-100 bg-slate-50/80 px-4 py-4 transition hover:bg-white"
                  >
                    <Avatar src={entry.avatarUrl} name={entry.name} username={entry.username} size="lg" />
                    <div>
                      <p className="font-semibold text-slate-900">{entry.name || entry.username || 'Unnamed user'}</p>
                      <p className="mt-1 text-sm text-slate-500">
                        {entry.username ? `@${entry.username}` : entry.email}
                      </p>
                    </div>
                  </Link>
                ))}
              </div>
            )
          ) : hashtags.length === 0 ? (
            <StatePanel title="Hashtags" description="No matching hashtags were found for this query." />
          ) : (
            <div className="grid gap-3 sm:grid-cols-2">
              {hashtags.map((tag) => (
                <Link
                  key={tag.id}
                  to={`/hashtag/${tag.name}`}
                  className="rounded-[28px] border border-slate-100 bg-slate-50/80 px-5 py-4 transition hover:bg-white"
                >
                  <p className="font-semibold text-slate-900">#{tag.name}</p>
                  <p className="mt-1 text-sm text-slate-500">{tag.count} tagged posts</p>
                </Link>
              ))}
            </div>
          )}
        </section>
      )}
    </AppShell>
  );
};

export default ExplorePage;
