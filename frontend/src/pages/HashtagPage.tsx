import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { searchService } from '../services/search.service';
import { Post } from '../types';
import { PostCard } from '../components/PostCard';
import toast from 'react-hot-toast';

const HashtagPage: React.FC = () => {
  const { name } = useParams();
  const [posts, setPosts] = useState<Post[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const loadPosts = async () => {
      if (!name) return;

      setIsLoading(true);
      try {
        const data = await searchService.getHashtagPosts(name);
        setPosts(data);
      } catch {
        toast.error('Failed to load posts');
      } finally {
        setIsLoading(false);
      }
    };

    loadPosts();
  }, [name]);

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <h1 className="text-xl font-semibold">
            <span className="text-blue-500">#{name}</span>
          </h1>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-6">
        {isLoading ? (
          <p className="text-gray-500 text-center">Loading posts...</p>
        ) : posts.length === 0 ? (
          <div className="bg-white rounded-lg shadow p-6 text-center">
            <p className="text-gray-600">No posts with this hashtag yet</p>
            <p className="text-gray-500 text-sm mt-2">Be the first to use #{name}!</p>
          </div>
        ) : (
          <div className="space-y-4">
            {posts.map((post) => (
              <PostCard key={post.id} post={post} />
            ))}
          </div>
        )}
      </main>
    </div>
  );
};

export default HashtagPage;
