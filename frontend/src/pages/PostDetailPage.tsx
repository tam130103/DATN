import React, { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import { AppShell } from '../components/layout/AppShell';
import { PostCard } from '../components/PostCard';
import { StatePanel } from '../components/common/StatePanel';
import { postService } from '../services/post.service';
import { Post } from '../types';

const PostDetailPage: React.FC = () => {
  const { postId } = useParams();
  const navigate = useNavigate();
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
        toast.error('Không thể tải bài viết.');
        setPost(null);
      } finally {
        setIsLoading(false);
      }
    };

    fetchPost();
  }, [postId]);

  if (isLoading) {
    return (
      <AppShell title="Bài viết" description="Đang tải chi tiết bài viết.">
        <StatePanel title="Bài viết" description="Đang lấy dữ liệu hình ảnh và tương tác." />
      </AppShell>
    );
  }

  if (!post) {
    return (
      <AppShell title="Bài viết" description="Không tìm thấy bài viết này.">
        <StatePanel title="Lỗi" description="Không thể tìm thấy bài viết." />
      </AppShell>
    );
  }

  const aside = (
    <div className="sticky top-6 space-y-4">
      <div className="surface-card rounded-xl p-5">
        <p className="text-base font-semibold text-[var(--app-text)]">Thông tin bài viết</p>
        <div className="mt-4 space-y-3 text-sm text-[var(--app-muted-strong)]">
          <p>
            Đã đăng <span className="font-semibold text-[var(--app-text)]">{new Date(post.createdAt).toLocaleDateString()}</span>
          </p>
          <p>
            {post.likesCount ?? 0} lượt thích | {post.commentsCount ?? 0} bình luận
          </p>
          <p>{post.media?.length || 0} mục phương tiện</p>
        </div>
      </div>

      {post.postHashtags?.length ? (
        <div className="surface-card rounded-xl p-5">
          <p className="text-base font-semibold text-[var(--app-text)]">Hashtags</p>
          <div className="mt-4 flex flex-wrap gap-2">
            {post.postHashtags.map((item) => (
              <Link
                key={item.id}
                to={`/hashtag/${item.hashtag.name}`}
                className="rounded-full bg-[var(--app-bg-soft)] px-3 py-1.5 text-sm font-semibold text-[var(--app-primary)] transition hover:bg-[var(--app-primary-soft)]"
              >
                #{item.hashtag.name}
              </Link>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );

  return (
    <AppShell
      title="Bài viết"
      description="Chi tiết bài viết."
      action={
        <Link
          to={post.user ? `/${post.user.username || post.user.id}` : '#'}
          className="inline-flex min-h-[38px] items-center justify-center rounded-md bg-[var(--app-primary)] px-4 text-sm font-semibold text-white transition hover:bg-[var(--app-primary-strong)]"
        >
          Xem trang cá nhân
        </Link>
      }
      aside={aside}
    >
      <PostCard
        post={post}
        onDeleted={() => {
          setPost(null);
          navigate('/feed');
        }}
      />
    </AppShell>
  );
};

export default PostDetailPage;
