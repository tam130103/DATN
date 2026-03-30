import React, { useState, useRef } from 'react';
import toast from 'react-hot-toast';
import { postService } from '../services/post.service';
import { userService } from '../services/user.service';
import { useAuth } from '../contexts/AuthContext';
import { Avatar } from './common/Avatar';
import { User } from '../types';

interface CreatePostProps {
  onPostCreated?: () => void;
}

type MediaDraft = {
  file: File;
  preview: string;
  type: 'IMAGE' | 'VIDEO';
};

type AIAction = 'caption' | 'hashtags' | null;

const getApiMessage = (error: unknown, fallback: string) => {
  if (typeof error === 'object' && error && 'response' in error) {
    const response = (error as any).response?.data;
    if (typeof response?.message === 'string') {
      return response.message;
    }
    if (Array.isArray(response?.message) && response.message.length > 0) {
      return response.message[0];
    }
  }

  if (typeof error === 'object' && error && 'message' in error && typeof (error as any).message === 'string') {
    return (error as any).message;
  }

  return fallback;
};

const appendUniqueHashtags = (caption: string, suggestedTags: string[]) => {
  const existingTags = new Set(
    Array.from(caption.matchAll(/#[a-zA-Z0-9_]+/g)).map((item) => item[0].toLowerCase()),
  );

  const newTags = suggestedTags.filter((tag) => !existingTags.has(tag.toLowerCase()));
  if (newTags.length === 0) {
    return caption;
  }

  const trimmedCaption = caption.trimEnd();
  return trimmedCaption ? `${trimmedCaption}\n\n${newTags.join(' ')}` : newTags.join(' ');
};

export const CreatePost: React.FC<CreatePostProps> = ({ onPostCreated }) => {
  const { user } = useAuth();
  const [caption, setCaption] = useState('');
  const [mediaFiles, setMediaFiles] = useState<MediaDraft[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [aiAction, setAiAction] = useState<AIAction>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [showSuggestions, setShowSuggestions] = useState(false);
  const [suggestions, setSuggestions] = useState<User[]>([]);
  const [cursorPosition, setCursorPosition] = useState(0);

  const isCaptionLoading = aiAction === 'caption';
  const isHashtagLoading = aiAction === 'hashtags';
  const isAnyAILoading = aiAction !== null;

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (mediaFiles.length + files.length > 10) {
      toast.error('Bạn chỉ có thể đăng tối đa 10 ảnh hoặc video.');
      return;
    }

    const newMedia: MediaDraft[] = files.map((file) => ({
      file,
      preview: URL.createObjectURL(file),
      type: file.type.startsWith('video') ? 'VIDEO' : 'IMAGE',
    }));
    setMediaFiles((prev) => [...prev, ...newMedia]);
  };

  const handleTextChange = async (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const text = e.target.value;
    setCaption(text);

    const cursor = e.target.selectionStart;
    setCursorPosition(cursor);

    const textBeforeCursor = text.slice(0, cursor);
    const match = textBeforeCursor.match(/@([a-zA-Z0-9_.]*)$/);

    if (match && user) {
      const query = match[1];
      setShowSuggestions(true);

      try {
        const following = await userService.getFollowing(user.id, 1, 50);
        const filtered = following.filter(
          (u) =>
            (u.username || '').toLowerCase().includes(query.toLowerCase()) ||
            (u.name || '').toLowerCase().includes(query.toLowerCase()),
        );
        setSuggestions(filtered);
      } catch (error) {
        console.error('Failed to load mention suggestions', error);
      }
    } else {
      setShowSuggestions(false);
    }
  };

  const insertMention = (username: string) => {
    const textBeforeCursor = caption.slice(0, cursorPosition);
    const textAfterCursor = caption.slice(cursorPosition);
    const matchIndex = textBeforeCursor.lastIndexOf('@');

    if (matchIndex !== -1) {
      const newText = textBeforeCursor.slice(0, matchIndex) + `@${username} ` + textAfterCursor;
      setCaption(newText);
    }

    setShowSuggestions(false);
  };

  const removeMedia = (index: number) => {
    setMediaFiles((prev) => {
      const newMedia = [...prev];
      URL.revokeObjectURL(newMedia[index].preview);
      newMedia.splice(index, 1);
      return newMedia;
    });
  };

  const resetComposer = () => {
    setCaption('');
    mediaFiles.forEach((m) => URL.revokeObjectURL(m.preview));
    setMediaFiles([]);
    setShowSuggestions(false);
    setSuggestions([]);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!caption.trim()) {
      toast.error('Hãy viết nội dung trước khi đăng bài.');
      return;
    }

    setIsLoading(true);
    try {
      let uploadedMedia: { url: string; type: 'IMAGE' | 'VIDEO' }[] | undefined;

      if (mediaFiles.length > 0) {
        uploadedMedia = await Promise.all(
          mediaFiles.map(async (media) => ({
            url: await postService.uploadMedia(media.file),
            type: media.type,
          })),
        );
      }

      await postService.createPost({ caption, media: uploadedMedia });
      resetComposer();
      toast.success('Đăng bài thành công.');
      onPostCreated?.();
    } catch (error) {
      toast.error(getApiMessage(error, 'Không thể đăng bài lúc này.'));
    } finally {
      setIsLoading(false);
    }
  };

  const handleAISuggest = async () => {
    const prompt = window.prompt(
      'Bạn muốn AI viết nội dung về chủ đề gì? Ví dụ: đi du lịch Đà Lạt, cảm xúc hôm nay, review quán ăn...',
    );
    const normalizedPrompt = prompt?.trim();
    if (!normalizedPrompt) {
      return;
    }

    setAiAction('caption');
    try {
      const suggested = await postService.generateCaption(normalizedPrompt);
      setCaption(suggested);
      toast.success('AI đã tạo nội dung xong. Bạn có thể chỉnh sửa trước khi đăng.');
    } catch (error) {
      toast.error(getApiMessage(error, 'AI đang bận, vui lòng thử lại sau.'));
    } finally {
      setAiAction(null);
    }
  };

  const handleHashtagSuggest = async () => {
    if (!caption.trim()) {
      toast.error('Hãy nhập nội dung trước khi gợi ý hashtag.');
      return;
    }

    setAiAction('hashtags');
    try {
      const tags = await postService.suggestHashtags(caption);
      const updatedCaption = appendUniqueHashtags(caption, tags);

      if (updatedCaption === caption) {
        toast.success('Không có hashtag mới để thêm.');
      } else {
        setCaption(updatedCaption);
        toast.success('Đã thêm hashtag gợi ý.');
      }
    } catch (error) {
      toast.error(getApiMessage(error, 'Không thể gợi ý hashtag lúc này.'));
    } finally {
      setAiAction(null);
    }
  };

  return (
    <div className="border-b border-[#dbdbdb] bg-white transition-shadow md:rounded-lg md:border md:shadow-sm">
      <form onSubmit={handleSubmit} data-testid="create-post-form">
        <div className="relative flex items-start gap-3 p-3">
          <Avatar src={user?.avatarUrl} name={user?.name} username={user?.username} size="sm" />
          <div className="relative w-full">
            <textarea
              value={caption}
              onChange={handleTextChange}
              placeholder="Bạn đang nghĩ gì?"
              data-testid="create-post-caption"
              className="min-h-[56px] w-full resize-none bg-transparent text-sm outline-none placeholder:text-[#8e8e8e]"
              rows={2}
            />

            {showSuggestions && suggestions.length > 0 && (
              <div className="absolute left-0 top-full z-50 mt-1 max-h-48 w-full overflow-y-auto rounded-lg border border-[#dbdbdb] bg-white shadow-lg sm:w-64">
                {suggestions.map((suggestion) => (
                  <button
                    key={suggestion.id}
                    type="button"
                    onClick={() => insertMention(suggestion.username || suggestion.name || '')}
                    className="flex w-full items-center gap-3 px-3 py-2 text-left hover:bg-gray-100"
                  >
                    <Avatar
                      src={suggestion.avatarUrl}
                      name={suggestion.name}
                      username={suggestion.username}
                      size="sm"
                    />
                    <div className="flex flex-col overflow-hidden">
                      <span className="truncate text-sm font-semibold">{suggestion.username}</span>
                      <span className="truncate text-xs text-[#8e8e8e]">{suggestion.name}</span>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {mediaFiles.length > 0 && (
          <div className="flex gap-2 overflow-x-auto px-3 pb-3">
            {mediaFiles.map((media, index) => (
              <div key={index} className="relative flex-shrink-0">
                {media.type === 'IMAGE' ? (
                  <img src={media.preview} alt="" className="h-20 w-20 rounded-md object-cover" />
                ) : (
                  <video src={media.preview} className="h-20 w-20 rounded-md object-cover" />
                )}
                <button
                  type="button"
                  onClick={() => removeMedia(index)}
                  className="absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-black text-[10px] text-white"
                >
                  x
                </button>
              </div>
            ))}
          </div>
        )}

        <div className="flex items-center justify-between border-t border-[#efefef] px-3 py-2">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*,video/*"
            multiple
            onChange={handleFileSelect}
            className="hidden"
            data-testid="create-post-media-input"
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={mediaFiles.length >= 10 || isLoading}
            className="text-sm text-[#8e8e8e] hover:text-[#262626] disabled:opacity-40"
          >
            <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="3" y="3" width="18" height="18" rx="2" />
              <circle cx="8.5" cy="8.5" r="1.5" fill="currentColor" />
              <polyline points="21 15 16 10 5 21" />
            </svg>
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleHashtagSuggest}
              disabled={isAnyAILoading || !caption.trim()}
              title="Gợi ý hashtag"
              className="flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium text-[#8e8e8e] transition hover:bg-gray-100 hover:text-[#0095f6] disabled:opacity-40"
            >
              {isHashtagLoading ? (
                <span className="h-3 w-3 animate-spin rounded-full border-2 border-current border-t-transparent" />
              ) : (
                '# AI'
              )}
            </button>
            <button
              type="button"
              onClick={handleAISuggest}
              disabled={isAnyAILoading}
              className="flex items-center gap-1 rounded-md bg-gradient-to-r from-purple-500 to-blue-500 px-3 py-1 text-xs font-semibold text-white shadow-sm transition hover:opacity-90 disabled:opacity-40"
            >
              {isCaptionLoading ? (
                <span className="h-3 w-3 animate-spin rounded-full border-2 border-white border-t-transparent" />
              ) : (
                'AI Assist'
              )}
            </button>
          </div>

          <button
            type="submit"
            disabled={isLoading || !caption.trim()}
            data-testid="create-post-submit"
            className="rounded-lg bg-[#0095f6] px-4 py-1.5 text-sm font-semibold text-white transition hover:bg-[#1877f2] disabled:opacity-40"
          >
            {isLoading ? 'Đang đăng...' : 'Đăng'}
          </button>
        </div>
      </form>
    </div>
  );
};
