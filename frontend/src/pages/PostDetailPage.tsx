import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { AppShell } from '../components/layout/AppShell';
import { PostCard } from '../components/PostCard';
import { StatePanel } from '../components/common/StatePanel';
import { postService } from '../services/post.service';
import { Post } from '../types';

const PostDetailPage: React.FC = () => {
  const { postId } = useParams();
  const [post, setPost] = useState<Post | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!postId) return;

    const fetchPost = async () => {
      setIsLoading(true);
      try {
        const data = await postService.getPostById(postId);
        setPost(data);
      } catch {
        toast.error('Failed to load post.');
        setPost(null);
      } finally {
        setIsLoading(false);
      }
    };

    fetchPost();
  }, [postId]);

  if (isLoading) {
    return (
      <AppShell title="Post" description="Loading post details.">
        <StatePanel title="Post" description="Fetching media and reactions." />
      </AppShell>
    );
  }

  if (!post) {
    return (
      <AppShell title="Post" description="This post could not be found.">
        <StatePanel title="Missing" description="We could not locate this post." />
      </AppShell>
    );
  }

  return (
    <AppShell
      title="Post"
      description="Post details and discussion."
      action={
        <Link
          to={post.user?.username ? `/${post.user.username}` : '/profile'}
          className="rounded-2xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
        >
          View profile
        </Link>
      }
    >
      <PostCard post={post} />
    </AppShell>
  );
};

export default PostDetailPage;
