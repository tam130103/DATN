import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import { AppShell } from '../components/layout/AppShell';
import { PostCard } from '../components/PostCard';
import { StatePanel } from '../components/common/StatePanel';
import { Hashtag, Post } from '../types';
import { searchService } from '../services/search.service';

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
        toast.error('Failed to load hashtag stream.');
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, [name]);

  const aside = (
    <div className="rounded-[32px] border border-white/70 bg-white/80 p-5 shadow-[0_30px_80px_-50px_rgba(15,23,42,0.45)] backdrop-blur">
      <p className="text-xs uppercase tracking-[0.35em] text-slate-400">Related radar</p>
      <h3 className="mt-3 text-xl font-semibold text-slate-900">Other active tags</h3>
      <div className="mt-4 space-y-3">
        {relatedHashtags.slice(0, 6).map((tag) => (
          <a
            key={tag.id}
            href={`/hashtag/${tag.name}`}
            className="flex items-center justify-between rounded-2xl bg-slate-50 px-4 py-3 transition hover:bg-slate-100"
          >
            <div>
              <p className="font-semibold text-slate-900">#{tag.name}</p>
              <p className="text-xs uppercase tracking-[0.24em] text-slate-400">Momentum</p>
            </div>
            <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-slate-600 shadow-sm">{tag.count}</span>
          </a>
        ))}
      </div>
    </div>
  );

  return (
    <AppShell
      title={`#${name || 'hashtag'}`}
      description="A focused stream for one topic. Track how people use the tag and what media is being attached to it."
      aside={aside}
    >
      {isLoading ? (
        <StatePanel title="Hashtag" description="Loading posts from this hashtag stream." />
      ) : posts.length === 0 ? (
        <StatePanel title="Quiet" description={`No posts have been tagged with #${name} yet.`} />
      ) : (
        <div className="space-y-5">
          {posts.map((post) => (
            <PostCard key={post.id} post={post} onDeleted={(postId) => setPosts((prev) => prev.filter((item) => item.id !== postId))} />
          ))}
        </div>
      )}
    </AppShell>
  );
};

export default HashtagPage;
