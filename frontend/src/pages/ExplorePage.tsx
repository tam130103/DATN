import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { searchService } from '../services/search.service';
import { User, Hashtag, Post } from '../types';
import toast from 'react-hot-toast';

const ExplorePage: React.FC = () => {
  const { user } = useAuth();
  const [searchParams] = setSearchParams();
  const query = searchParams.get('q') || '';

  const [users, setUsers] = useState<User[]>([]);
  const [hashtags, setHashtags] = useState<Hashtag[]>([]);
  const [trendingHashtags, setTrendingHashtags] = useState<Hashtag[]>([]);
  const [activeTab, setActiveTab] = useState<'users' | 'hashtags' | 'trending'>('users');
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const loadTrending = async () => {
      try {
        const data = await searchService.getTrendingHashtags();
        setTrendingHashtags(data);
      } catch {
        console.error('Failed to load trending hashtags');
      }
    };

    loadTrending();
  }, []);

  useEffect(() => {
    if (!query) {
      setUsers([]);
      setHashtags([]);
      return;
    }

    const loadResults = async () => {
      setIsLoading(true);
      try {
        const [usersData, hashtagsData] = await Promise.all([
          searchService.searchUsers(query),
          searchService.searchHashtags(query),
        ]);
        setUsers(usersData);
        setHashtags(hashtagsData);
      } catch {
        toast.error('Search failed');
      } finally {
        setIsLoading(false);
      }
    };

    loadResults();
  }, [query]);

  const handleSearch = (value: string) => {
    if (value) {
      searchParams.set('q', value);
    } else {
      searchParams.delete('q');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <h1 className="text-xl font-semibold">Explore</h1>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-6">
        {/* Search */}
        <div className="bg-white rounded-lg shadow p-4 mb-6">
          <input
            type="text"
            placeholder="Search users or hashtags..."
            value={query}
            onChange={(e) => handleSearch(e.target.value)}
            className="w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {!query ? (
          /* Trending Hashtags */
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold mb-4">Trending Hashtags</h2>
            {trendingHashtags.length === 0 ? (
              <p className="text-gray-500">No trending hashtags yet</p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {trendingHashtags.map((tag) => (
                  <a
                    key={tag.id}
                    href={`?q=${encodeURIComponent(tag.name)}`}
                    className="px-4 py-2 bg-blue-50 text-blue-600 rounded-full hover:bg-blue-100 transition-colors"
                  >
                    #{tag.name} ({tag.count})
                  </a>
                ))}
              </div>
            )}
          </div>
        ) : (
          /* Search Results */
          <div className="bg-white rounded-lg shadow overflow-hidden">
            {/* Tabs */}
            <div className="flex border-b">
              <button
                onClick={() => setActiveTab('users')}
                className={`flex-1 py-3 text-center font-medium transition-colors ${
                  activeTab === 'users' ? 'border-b-2 border-blue-500 text-blue-500' : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Users ({users.length})
              </button>
              <button
                onClick={() => setActiveTab('hashtags')}
                className={`flex-1 py-3 text-center font-medium transition-colors ${
                  activeTab === 'hashtags' ? 'border-b-2 border-blue-500 text-blue-500' : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Hashtags ({hashtags.length})
              </button>
            </div>

            {/* Results */}
            <div className="p-4">
              {isLoading ? (
                <p className="text-gray-500 text-center">Searching...</p>
              ) : activeTab === 'users' ? (
                users.length === 0 ? (
                  <p className="text-gray-500 text-center">No users found</p>
                ) : (
                  <div className="space-y-3">
                    {users.map((u) => (
                      <a
                        key={u.id}
                        href={`/${u.username || ''}`}
                        className="flex items-center space-x-3 p-3 hover:bg-gray-50 rounded-lg transition-colors"
                      >
                        {u.avatarUrl ? (
                          <img src={u.avatarUrl} alt="" className="w-12 h-12 rounded-full object-cover" />
                        ) : (
                          <div className="w-12 h-12 rounded-full bg-gray-200 flex items-center justify-center">
                            <span className="text-gray-500">{(u.name || 'U')[0]}</span>
                          </div>
                        )}
                        <div>
                          <p className="font-semibold">
                            {u.username ? `@${u.username}` : 'No username'}
                          </p>
                          <p className="text-sm text-gray-600">{u.name || ''}</p>
                        </div>
                      </a>
                    ))}
                  </div>
                )
              ) : (
                hashtags.length === 0 ? (
                  <p className="text-gray-500 text-center">No hashtags found</p>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {hashtags.map((tag) => (
                      <a
                        key={tag.id}
                        href={`/hashtag/${tag.name}`}
                        className="px-4 py-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-colors"
                      >
                        #{tag.name}
                      </a>
                    ))}
                  </div>
                )
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default ExplorePage;
