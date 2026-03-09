import React, { useState } from 'react';
import { Post, Comment } from '../types';
import { engagementService } from '../services/engagement.service';
import toast from 'react-hot-toast';

interface PostCardProps {
  post: Post;
}

export const PostCard: React.FC<PostCardProps> = ({ post }) => {
  const [currentMediaIndex, setCurrentMediaIndex] = useState(0);
  const [liked, setLiked] = useState(post.liked || false);
  const [likesCount, setLikesCount] = useState(post.likesCount || 0);
  const [showComments, setShowComments] = useState(false);
  const [comments, setComments] = useState<Comment[]>([]);
  const [commentText, setCommentText] = useState('');
  const [isLoadingComments, setIsLoadingComments] = useState(false);

  const media = post.media && post.media.length > 0
    ? post.media.sort((a, b) => (a.orderIndex || 0) - (b.orderIndex || 0))
    : [];

  const nextMedia = () => {
    if (currentMediaIndex < media.length - 1) {
      setCurrentMediaIndex(currentMediaIndex + 1);
    }
  };

  const prevMedia = () => {
    if (currentMediaIndex > 0) {
      setCurrentMediaIndex(currentMediaIndex - 1);
    }
  };

  const handleLikeToggle = async () => {
    const originalLiked = liked;
    const originalCount = likesCount;

    // Optimistic update
    setLiked(!originalLiked);
    setLikesCount(originalLiked ? originalCount - 1 : originalCount + 1);

    try {
      const result = await engagementService.toggleLike(post.id);
      setLiked(result.liked);
      setLikesCount(result.liked ? originalCount + 1 : originalCount - 1);
    } catch {
      // Revert on error
      setLiked(originalLiked);
      setLikesCount(originalCount);
      toast.error('Failed to update like');
    }
  };

  const loadComments = async () => {
    if (comments.length > 0) {
      setShowComments(!showComments);
      return;
    }

    setIsLoadingComments(true);
    try {
      const data = await engagementService.getPostComments(post.id);
      setComments(data);
      setShowComments(true);
    } catch {
      toast.error('Failed to load comments');
    } finally {
      setIsLoadingComments(false);
    }
  };

  const handleSubmitComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!commentText.trim()) return;

    try {
      const newComment = await engagementService.createComment(post.id, commentText);
      setComments([newComment, ...comments]);
      setCommentText('');
      toast.success('Comment added');
    } catch {
      toast.error('Failed to add comment');
    }
  };

  const renderCaption = (text: string) => {
    const parts = text.split(/(#\w+)/g);
    return parts.map((part, index) => {
      if (part.startsWith('#')) {
        return (
          <span key={index} className="text-blue-600 hover:text-blue-700 hover:underline cursor-pointer transition-colors">
            {part}
          </span>
        );
      }
      return <span key={index}>{part}</span>;
    });
  };

  return (
    <div className="bg-white rounded-2xl shadow-md border border-gray-100 overflow-hidden transition-all duration-200 hover:shadow-lg mb-4">
      {/* Header */}
      <div className="p-4 flex items-center space-x-3 border-b border-gray-100">
        {post.user?.avatarUrl ? (
          <img
            src={post.user.avatarUrl}
            alt={post.user.username || 'Avatar'}
            className="w-12 h-12 rounded-full object-cover border-2 border-gray-100"
          />
        ) : (
          <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-indigo-500 flex items-center justify-center">
            <span className="text-white font-semibold text-lg">
              {(post.user?.name || post.user?.username || 'U')[0]?.toUpperCase() || 'U'}
            </span>
          </div>
        )}
        <div className="flex-1">
          <p className="font-semibold text-gray-900">
            {post.user?.name || (post.user?.username ? `@${post.user.username}` : 'Unknown User')}
          </p>
          <p className="text-xs text-gray-500">
            {new Date(post.createdAt).toLocaleDateString('en-US', {
              month: 'short',
              day: 'numeric',
              hour: '2-digit',
              minute: '2-digit'
            })}
          </p>
        </div>
      </div>

      {/* Media Carousel */}
      {media.length > 0 && (
        <div className="relative bg-gray-50">
          <div className="aspect-[4/5] max-h-[600px] bg-black">
            {media[currentMediaIndex].type === 'IMAGE' ? (
              <img
                src={media[currentMediaIndex].url}
                alt={`Post media ${currentMediaIndex + 1}`}
                className="w-full h-full object-contain"
              />
            ) : (
              <video
                src={media[currentMediaIndex].url}
                controls
                className="w-full h-full object-contain"
              />
            )}
          </div>

          {media.length > 1 && (
            <>
              <button
                onClick={prevMedia}
                disabled={currentMediaIndex === 0}
                aria-label="Previous media"
                className="absolute left-3 top-1/2 -translate-y-1/2 bg-white bg-opacity-90 hover:bg-opacity-100 rounded-full w-10 h-10 flex items-center justify-center shadow-md transition-all duration-200 disabled:opacity-30 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <svg className="w-6 h-6 text-gray-800" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <button
                onClick={nextMedia}
                disabled={currentMediaIndex === media.length - 1}
                aria-label="Next media"
                className="absolute right-3 top-1/2 -translate-y-1/2 bg-white bg-opacity-90 hover:bg-opacity-100 rounded-full w-10 h-10 flex items-center justify-center shadow-md transition-all duration-200 disabled:opacity-30 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <svg className="w-6 h-6 text-gray-800" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
              <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex space-x-1.5">
                {media.map((_, index) => (
                  <span
                    key={index}
                    className={`w-2 h-2 rounded-full transition-all duration-200 ${
                      index === currentMediaIndex ? 'bg-white' : 'bg-white bg-opacity-50'
                    }`}
                  />
                ))}
              </div>
            </>
          )}
        </div>
      )}

      {/* Actions */}
      <div className="p-4 flex items-center space-x-4 border-b border-gray-100">
        <button
          onClick={handleLikeToggle}
          className="flex items-center space-x-2 group transition-all duration-200"
          aria-label={liked ? 'Unlike post' : 'Like post'}
        >
          <span className={`text-2xl transition-transform duration-200 active:scale-110 ${liked ? 'text-red-500' : 'text-gray-700 group-hover:text-red-500'}`}>
            {liked ? '❤️' : '🤍'}
          </span>
          <span className="text-sm font-medium text-gray-600">
            {likesCount} {likesCount === 1 ? 'like' : 'likes'}
          </span>
        </button>

        <button
          onClick={loadComments}
          className="ml-auto text-blue-600 hover:text-blue-700 font-medium transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-auto"
          disabled={isLoadingComments}
        >
          {isLoadingComments ? 'Loading...' : showComments ? 'Hide' : 'View'} comments
        </button>
      </div>

      {/* Caption */}
      <div className="p-4">
        <p className="text-gray-800 leading-relaxed whitespace-pre-wrap">{renderCaption(post.caption)}</p>
      </div>

      {/* Comments */}
      {showComments && (
        <div className="p-4 border-t border-gray-100 bg-gray-50">
          <form onSubmit={handleSubmitComment} className="flex space-x-3 mb-4">
            <input
              type="text"
              value={commentText}
              onChange={(e) => setCommentText(e.target.value)}
              placeholder="Add a comment..."
              className="flex-1 px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
            />
            <button
              type="submit"
              disabled={!commentText.trim()}
              className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-medium transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
            >
              Post
            </button>
          </form>

          <div className="space-y-3 max-h-60 overflow-y-auto">
            {comments.length === 0 ? (
              <p className="text-gray-500 text-center py-4">No comments yet. Be the first to comment!</p>
            ) : (
              comments.map((comment) => (
                <div key={comment.id} className="flex space-x-3">
                  {comment.user?.avatarUrl ? (
                    <img
                      src={comment.user.avatarUrl}
                      alt=""
                      className="w-10 h-10 rounded-full object-cover border border-gray-200"
                    />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-400 to-indigo-400 flex items-center justify-center">
                      <span className="text-white text-sm font-semibold">
                        {(comment.user?.name || comment.user?.username || 'U')[0]?.toUpperCase() || 'U'}
                      </span>
                    </div>
                  )}
                  <div className="flex-1">
                    <p className="text-sm">
                      <span className="font-semibold text-gray-900">
                        {comment.user?.name || (comment.user?.username ? `@${comment.user.username}` : 'Unknown')}
                      </span>{' '}
                      <span className="text-gray-700">{comment.content}</span>
                    </p>
                    <p className="text-xs text-gray-500 mt-0.5">
                      {new Date(comment.createdAt).toLocaleString()}
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};
