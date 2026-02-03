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

  const media = post.media.sort((a, b) => a.orderIndex - b.orderIndex);

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
          <span key={index} className="text-blue-500 hover:underline cursor-pointer">
            {part}
          </span>
        );
      }
      return <span key={index}>{part}</span>;
    });
  };

  return (
    <div className="bg-white rounded-lg shadow overflow-hidden">
      {/* Header */}
      <div className="p-3 flex items-center space-x-3 border-b">
        {post.user.avatarUrl ? (
          <img
            src={post.user.avatarUrl}
            alt={post.user.username || 'Avatar'}
            className="w-10 h-10 rounded-full object-cover"
          />
        ) : (
          <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center">
            <span className="text-gray-500">
              {(post.user.name || post.user.username || 'U')[0].toUpperCase()}
            </span>
          </div>
        )}
        <div>
          <p className="font-semibold">
            {post.user.username ? `@${post.user.username}` : 'Unknown'}
          </p>
          <p className="text-xs text-gray-500">
            {new Date(post.createdAt).toLocaleDateString()}
          </p>
        </div>
      </div>

      {/* Media Carousel */}
      <div className="relative">
        {media.length > 0 && (
          <div className="aspect-square bg-black">
            {media[currentMediaIndex].type === 'IMAGE' ? (
              <img
                src={media[currentMediaIndex].url}
                alt="Post media"
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
        )}

        {media.length > 1 && (
          <>
            <button
              onClick={prevMedia}
              disabled={currentMediaIndex === 0}
              className="absolute left-2 top-1/2 -translate-y-1/2 bg-white bg-opacity-80 rounded-full w-8 h-8 flex items-center justify-center disabled:opacity-30"
            >
              ‹
            </button>
            <button
              onClick={nextMedia}
              disabled={currentMediaIndex === media.length - 1}
              className="absolute right-2 top-1/2 -translate-y-1/2 bg-white bg-opacity-80 rounded-full w-8 h-8 flex items-center justify-center disabled:opacity-30"
            >
              ›
            </button>
            <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex space-x-1">
              {media.map((_, index) => (
                <span
                  key={index}
                  className={`w-2 h-2 rounded-full ${
                    index === currentMediaIndex ? 'bg-white' : 'bg-white bg-opacity-50'
                  }`}
                />
              ))}
            </div>
          </>
        )}
      </div>

      {/* Actions */}
      <div className="p-3 flex items-center space-x-4 border-b">
        <button
          onClick={handleLikeToggle}
          className={`text-2xl transition-colors ${liked ? 'text-red-500' : 'text-gray-700'}`}
        >
          {liked ? '❤️' : '🤍'}
        </button>
        <span className="text-sm text-gray-600">{likesCount} likes</span>

        <button
          onClick={loadComments}
          className="ml-auto text-blue-500 hover:underline"
          disabled={isLoadingComments}
        >
          {isLoadingComments ? 'Loading...' : showComments ? 'Hide' : 'View'} comments
        </button>
      </div>

      {/* Caption */}
      <div className="p-3">
        <p className="text-gray-800">{renderCaption(post.caption)}</p>
        {post.postHashtags.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-2">
            {post.postHashtags.map((ph) => (
              <span
                key={ph.id}
                className="text-sm text-blue-500 hover:underline cursor-pointer"
              >
                #{ph.hashtag.name}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Comments */}
      {showComments && (
        <div className="p-3 border-t">
          <form onSubmit={handleSubmitComment} className="flex space-x-2 mb-3">
            <input
              type="text"
              value={commentText}
              onChange={(e) => setCommentText(e.target.value)}
              placeholder="Add a comment..."
              className="flex-1 px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <button
              type="submit"
              disabled={!commentText.trim()}
              className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50"
            >
              Post
            </button>
          </form>

          <div className="space-y-2 max-h-60 overflow-y-auto">
            {comments.length === 0 ? (
              <p className="text-gray-500 text-center py-2">No comments yet</p>
            ) : (
              comments.map((comment) => (
                <div key={comment.id} className="flex space-x-2">
                  {comment.user.avatarUrl ? (
                    <img
                      src={comment.user.avatarUrl}
                      alt=""
                      className="w-8 h-8 rounded-full object-cover"
                    />
                  ) : (
                    <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center">
                      <span className="text-xs text-gray-500">
                        {(comment.user.name || comment.user.username || 'U')[0].toUpperCase()}
                      </span>
                    </div>
                  )}
                  <div className="flex-1">
                    <p className="text-sm">
                      <span className="font-semibold">
                        {comment.user.username ? `@${comment.user.username}` : 'Unknown'}
                      </span>{' '}
                      <span className="text-gray-700">{comment.content}</span>
                    </p>
                    <p className="text-xs text-gray-500">
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
