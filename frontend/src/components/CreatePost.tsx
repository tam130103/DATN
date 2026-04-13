import React, { useCallback, useRef, useState } from 'react';
import toast from 'react-hot-toast';
import { postService } from '../services/post.service';
import { userService } from '../services/user.service';
import { useAuth } from '../contexts/AuthContext';
import { getApiMessage } from '../utils/api-error';
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

const PhotoIcon = () => (
  <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.9">
    <rect x="3" y="3" width="18" height="18" rx="2" />
    <circle cx="8.5" cy="8.5" r="1.5" fill="currentColor" />
    <polyline points="21 15 16 10 5 21" />
  </svg>
);

const SparkIcon = () => (
  <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.9">
    <path d="M12 2l1.9 5.1L19 9l-5.1 1.9L12 16l-1.9-5.1L5 9l5.1-1.9L12 2z" />
    <path d="M5 17l.9 2.1L8 20l-2.1.9L5 23l-.9-2.1L2 20l2.1-.9L5 17z" />
  </svg>
);



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
  const mentionDebounceRef = useRef<ReturnType<typeof setTimeout>>();

  const [showSuggestions, setShowSuggestions] = useState(false);
  const [suggestions, setSuggestions] = useState<User[]>([]);
  const [cursorPosition, setCursorPosition] = useState(0);

  const isCaptionLoading = aiAction === 'caption';
  const isHashtagLoading = aiAction === 'hashtags';
  const isAnyAILoading = aiAction !== null;

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (mediaFiles.length + files.length > 10) {
      toast.error('Bạn chỉ có thể tải lên tối đa 10 hình ảnh hoặc video.');
      return;
    }

    const newMedia: MediaDraft[] = files.map((file) => ({
      file,
      preview: URL.createObjectURL(file),
      type: file.type.startsWith('video') ? 'VIDEO' : 'IMAGE',
    }));
    setMediaFiles((prev) => [...prev, ...newMedia]);
  };

  const handleTextChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const text = e.target.value;
    setCaption(text);

    const cursor = e.target.selectionStart;
    setCursorPosition(cursor);

    const textBeforeCursor = text.slice(0, cursor);
    const match = textBeforeCursor.match(/@([a-zA-Z0-9_.]*)$/);

    if (match && user) {
      const query = match[1];
      setShowSuggestions(true);

      // Debounce API call to avoid spamming on every keystroke
      clearTimeout(mentionDebounceRef.current);
      mentionDebounceRef.current = setTimeout(async () => {
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
      }, 300);
    } else {
      setShowSuggestions(false);
      clearTimeout(mentionDebounceRef.current);
    }
  }, [user]);

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
      const next = [...prev];
      URL.revokeObjectURL(next[index].preview);
      next.splice(index, 1);
      return next;
    });
  };

  const resetComposer = () => {
    setCaption('');
    mediaFiles.forEach((media) => URL.revokeObjectURL(media.preview));
    setMediaFiles([]);
    setShowSuggestions(false);
    setSuggestions([]);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!caption.trim()) {
      toast.error('Hãy viết nội dung trước khi xuất bản.');
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
      toast.error(getApiMessage(error, 'Không thể chia sẻ bài viết lúc này.'));
    } finally {
      setIsLoading(false);
    }
  };

  const handleAISuggest = async () => {
    let normalizedPrompt = caption.trim();
    
    if (!normalizedPrompt) {
      const userInput = window.prompt(
        'AI nên viết về điều gì? Ví dụ: chuyến đi cuối tuần, review đồ ăn... (Hoặc nhập trực tiếp vào hộp trước!)',
      );
      normalizedPrompt = userInput?.trim() || '';
    }

    if (!normalizedPrompt) {
      toast.error('Vui lòng nhập một vài từ khóa hoặc ý tưởng để AI viết caption.');
      return;
    }

    setAiAction('caption');
    try {
      const result = await postService.generateCaption(normalizedPrompt);
      setCaption(result.text);
      if (result.meta?.degraded) {
        toast.success('AI đang bận, đã tạo bản nháp tạm dựa trên chủ đề.');
        return;
      }
      toast.success('AI đã viết xong bản nháp. Bạn có thể sửa trực tiếp ở trên.');
    } catch (error) {
      toast.error(getApiMessage(error, 'AI hiện tại đang bị lỗi. Vui lòng thử lại sau.'));
    } finally {
      setAiAction(null);
    }
  };

  const handleHashtagSuggest = async () => {
    if (!caption.trim()) {
      toast.error('Vui lòng viết tiêu đề trước khi lấy gợi ý hashtag.');
      return;
    }

    setAiAction('hashtags');
    try {
      const result = await postService.suggestHashtags(caption);
      const tags = result.hashtags;
      if (!tags.length) {
        if (result.meta?.degraded) {
          toast.error('AI đang bận và chưa tạo được hashtag tạm phù hợp.');
          return;
        }
        toast.error('Không thể tạo hashtag phù hợp lúc này. Vui lòng thử lại sau.');
        return;
      }

      const updatedCaption = appendUniqueHashtags(caption, tags);

      if (updatedCaption === caption) {
        if (result.meta?.degraded) {
          toast.error('AI đang bận, chưa có hashtag mới phù hợp để thêm vào.');
          return;
        }
        toast.success('Không có hashtag nào mới được thêm vào.');
      } else {
        setCaption(updatedCaption);
        if (result.meta?.degraded) {
          toast.success('AI đang bận, đã thêm hashtag gợi ý tạm.');
          return;
        }
        toast.success('Đã thêm hashtag đề xuất.');
      }
    } catch (error) {
      toast.error(getApiMessage(error, 'Không thể gợi ý hashtag lúc này.'));
    } finally {
      setAiAction(null);
    }
  };

  return (
    <div className="surface-card overflow-hidden rounded-xl">
      <form onSubmit={handleSubmit} data-testid="create-post-form">
        <div className="px-4 py-4">
          <div className="flex items-start gap-3">
            <Avatar
              src={user?.avatarUrl}
              name={user?.name}
              username={user?.username}
              size="md"
              ring
            />

            <div className="relative min-w-0 flex-1">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-[var(--app-text)]">
                    {user?.username || user?.name || 'Bạn'}
                  </p>
                  <p className="text-xs text-[var(--app-muted)]">
                    Chia sẻ ảnh, video, hoặc trạng thái với cộng đồng của bạn.
                  </p>
                </div>
                <span className="text-xs font-medium text-[var(--app-muted)]">
                  {mediaFiles.length}/10
                </span>
              </div>

              <div className="mt-3 rounded-lg border border-[var(--app-border)] bg-[var(--app-bg-soft)] px-4 py-3">
                <textarea
                  value={caption}
                  onChange={handleTextChange}
                  placeholder="Viết một vài suy nghĩ..."
                  data-testid="create-post-caption"
                  className="min-h-[60px] w-full resize-none bg-transparent text-sm leading-6 text-[var(--app-text)] placeholder:text-[var(--app-muted)]"
                  rows={2}
                />

                <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-[var(--app-border)] pt-3">
                  <p className="text-xs text-[var(--app-muted)]">
                    Nhắc đến ai đó bằng <span className="font-semibold">@username</span> hoặc thêm hashtags.
                  </p>
                  <span className="text-xs text-[var(--app-muted)]">{caption.trim().length} ký tự</span>
                </div>
              </div>

              {showSuggestions && suggestions.length > 0 ? (
                <div className="surface-card absolute left-0 top-full z-50 mt-2 w-full overflow-hidden rounded-lg sm:max-w-[360px]">
                  {suggestions.map((suggestion) => (
                    <button
                      key={suggestion.id}
                      type="button"
                      onClick={() => insertMention(suggestion.username || suggestion.name || '')}
                      className="flex w-full items-center gap-3 px-4 py-3 text-left transition hover:bg-[var(--app-bg-soft)]"
                    >
                      <Avatar
                        src={suggestion.avatarUrl}
                        name={suggestion.name}
                        username={suggestion.username}
                        size="sm"
                      />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold text-[var(--app-text)]">
                          {suggestion.username || suggestion.name}
                        </p>
                        <p className="truncate text-sm text-[var(--app-muted)]">{suggestion.name}</p>
                      </div>
                    </button>
                  ))}
                </div>
              ) : null}
            </div>
          </div>

          {mediaFiles.length > 0 ? (
            <div className="mt-4 grid grid-cols-3 gap-2 sm:grid-cols-4">
              {mediaFiles.map((media, index) => (
                <div key={index} className="relative overflow-hidden rounded-lg bg-slate-950">
                  {media.type === 'IMAGE' ? (
                    <img src={media.preview} alt="" className="aspect-square w-full object-cover" />
                  ) : (
                    <video src={media.preview} className="aspect-square w-full object-cover" />
                  )}
                  <button
                    type="button"
                    onClick={() => removeMedia(index)}
                    className="absolute right-2 top-2 flex h-7 w-7 items-center justify-center rounded-full bg-black/70 text-xs font-semibold text-white"
                  >
                    X
                  </button>
                </div>
              ))}
            </div>
          ) : null}
        </div>

        <div className="flex flex-col gap-3 border-t border-[var(--app-border)] px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap items-center gap-3">
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
              className="inline-flex min-h-[38px] items-center gap-2 rounded-md border border-[var(--app-border)] bg-[var(--app-surface)] px-3 text-sm font-medium text-[var(--app-text)] transition hover:bg-[var(--app-bg-soft)] disabled:opacity-40"
            >
              <PhotoIcon />
              Thêm tệp
            </button>

            <button
              type="button"
              onClick={handleHashtagSuggest}
              disabled={isAnyAILoading || !caption.trim()}
              className="inline-flex min-h-[38px] items-center gap-2 rounded-md px-2 text-sm font-semibold text-[var(--app-primary)] transition hover:bg-[var(--app-primary-soft)] disabled:opacity-40"
            >
              {isHashtagLoading ? (
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
              ) : (
                '#'
              )}
              Gợi ý hashtag
            </button>

            <button
              type="button"
              onClick={handleAISuggest}
              disabled={isAnyAILoading}
              className="inline-flex min-h-[38px] items-center gap-2 rounded-md px-2 text-sm font-semibold text-[var(--app-primary)] transition hover:bg-[var(--app-primary-soft)] disabled:opacity-40"
            >
              {isCaptionLoading ? (
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
              ) : (
                <SparkIcon />
              )}
              Viết bằng AI
            </button>
          </div>

          <button
            type="submit"
            disabled={isLoading || !caption.trim()}
            data-testid="create-post-submit"
            className="inline-flex min-h-[38px] items-center justify-center rounded-md bg-[var(--app-primary)] px-4 text-sm font-semibold text-white transition hover:bg-[var(--app-primary-strong)] disabled:opacity-40"
          >
            {isLoading ? 'Đang đăng...' : 'Chia sẻ'}
          </button>
        </div>
      </form>
    </div>
  );
};
