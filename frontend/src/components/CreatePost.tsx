import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import toast from 'react-hot-toast';
import { motion, useReducedMotion } from 'framer-motion';
import { Hash, ImageSquare, Sparkle, X } from '@phosphor-icons/react';
import { postService } from '../services/post.service';
import { userService } from '../services/user.service';
import { searchService } from '../services/search.service';
import { useAuth } from '../contexts/AuthContext';
import { getApiMessage } from '../utils/api-error';
import { Avatar } from './common/Avatar';
import { PromptDialog } from './common/PromptDialog';
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

type MentionSuggestion =
  | {
      kind: 'user';
      id: string;
      username: string;
      name: string | null;
      avatarUrl: string | null;
    }
  | {
      kind: 'command';
      id: 'broadcast-followers';
      token: '@@followers';
      label: string;
      description: string;
    };

const AI_PROMPTS = [
  'Hôm nay tôi cảm thấy...',
  'Một khoảnh khắc đáng nhớ là...',
  'Điều thú vị tôi học được hôm nay...',
];

const FOLLOWER_BROADCAST_MATCHERS = ['followers', 'tatca', 'moinguoi'] as const;

const FOLLOWER_BROADCAST_SUGGESTION: MentionSuggestion = {
  kind: 'command',
  id: 'broadcast-followers',
  token: '@@followers',
  label: '@@followers',
  description: 'Gắn thẻ tất cả người theo dõi của bạn',
};

const appendUniqueHashtags = (caption: string, suggestedTags: string[]) => {
  const existingTags = new Set(
    Array.from(caption.matchAll(/#[a-zA-Z0-9_]+/g)).map((item) => item[0].toLowerCase()),
  );

  const newTags = suggestedTags.filter((tag) => !existingTags.has(tag.toLowerCase()));
  if (newTags.length === 0) return caption;

  const trimmedCaption = caption.trimEnd();
  return trimmedCaption ? `${trimmedCaption}\n\n${newTags.join(' ')}` : newTags.join(' ');
};

export const CreatePost: React.FC<CreatePostProps> = ({ onPostCreated }) => {
  const { user } = useAuth();
  const prefersReducedMotion = useReducedMotion();
  const [caption, setCaption] = useState('');
  const [typedPlaceholder, setTypedPlaceholder] = useState(AI_PROMPTS[0]);
  const [mediaFiles, setMediaFiles] = useState<MediaDraft[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [aiAction, setAiAction] = useState<AIAction>(null);
  const [aiDraft, setAiDraft] = useState<string | null>(null);
  const [isPromptOpen, setIsPromptOpen] = useState(false);
  const [lastCaptionPrompt, setLastCaptionPrompt] = useState('');
  const [hashtagNotice, setHashtagNotice] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const mentionDebounceRef = useRef<ReturnType<typeof setTimeout>>();
  const mediaFilesRef = useRef<MediaDraft[]>([]);

  const [showSuggestions, setShowSuggestions] = useState(false);
  const [suggestions, setSuggestions] = useState<MentionSuggestion[]>([]);
  const [cursorPosition, setCursorPosition] = useState(0);

  const isCaptionLoading = aiAction === 'caption';
  const isHashtagLoading = aiAction === 'hashtags';
  const isAnyAILoading = aiAction !== null;

  useEffect(() => {
    mediaFilesRef.current = mediaFiles;
  }, [mediaFiles]);

  useEffect(() => {
    return () => {
      clearTimeout(mentionDebounceRef.current);
      mediaFilesRef.current.forEach((media) => URL.revokeObjectURL(media.preview));
    };
  }, []);

  useEffect(() => {
    if (caption.trim()) {
      setTypedPlaceholder(AI_PROMPTS[0]);
      return;
    }
    if (prefersReducedMotion) {
      setTypedPlaceholder(AI_PROMPTS[0]);
      return;
    }

    let promptIndex = 0;
    let charIndex = 0;
    let timeoutId: ReturnType<typeof setTimeout>;
    let cancelled = false;

    const tick = () => {
      if (cancelled) return;
      const prompt = AI_PROMPTS[promptIndex];
      setTypedPlaceholder(prompt.slice(0, charIndex + 1));

      if (charIndex < prompt.length - 1) {
        charIndex += 1;
        timeoutId = setTimeout(tick, 38);
        return;
      }

      timeoutId = setTimeout(() => {
        if (cancelled) return;
        promptIndex = (promptIndex + 1) % AI_PROMPTS.length;
        charIndex = 0;
        setTypedPlaceholder('');
        timeoutId = setTimeout(tick, 180);
      }, 1600);
    };

    tick();

    return () => {
      cancelled = true;
      clearTimeout(timeoutId);
    };
  }, [caption, prefersReducedMotion]);

  useEffect(() => {
    if (!hashtagNotice) return;
    const timeoutId = window.setTimeout(() => setHashtagNotice(null), 2200);
    return () => window.clearTimeout(timeoutId);
  }, [hashtagNotice]);

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    if (mediaFiles.length + files.length > 10) {
      toast.error('Bạn chỉ có thể tải lên tối đa 10 ảnh hoặc video.');
      event.target.value = '';
      return;
    }

    const newMedia: MediaDraft[] = files.map((file) => ({
      file,
      preview: URL.createObjectURL(file),
      type: file.type.startsWith('video') ? 'VIDEO' : 'IMAGE',
    }));
    setMediaFiles((prev) => [...prev, ...newMedia]);
    event.target.value = '';
  };

  const handleTextChange = useCallback(
    (event: React.ChangeEvent<HTMLTextAreaElement>) => {
      const text = event.target.value;
      setCaption(text);

      const cursor = event.target.selectionStart;
      setCursorPosition(cursor);

      const textBeforeCursor = text.slice(0, cursor);
      const broadcastMatch = textBeforeCursor.match(/(?:^|[^@\w])@@([a-zA-Z0-9_]*)$/);

      clearTimeout(mentionDebounceRef.current);

      if (broadcastMatch) {
        const query = broadcastMatch[1].toLowerCase();
        const shouldSuggest =
          !query || FOLLOWER_BROADCAST_MATCHERS.some((token) => token.includes(query));

        setSuggestions(shouldSuggest ? [FOLLOWER_BROADCAST_SUGGESTION] : []);
        setShowSuggestions(shouldSuggest);
        return;
      }

      const mentionMatch = textBeforeCursor.match(/(?:^|[^@\w])@([a-zA-Z0-9_.]*)$/);

      if (mentionMatch && user) {
        const query = mentionMatch[1];
        setShowSuggestions(true);

        mentionDebounceRef.current = setTimeout(async () => {
          try {
            const [followers, globalResults] = await Promise.all([
              userService.getFollowers(user.id, 1, 50),
              query.length >= 1 ? searchService.searchUsers(query, 1, 10) : Promise.resolve([]),
            ]);

            const seen = new Set<string>();
            const merged: MentionSuggestion[] = [];
            const normalizedQuery = query.toLowerCase();

            const filterAndPush = (list: User[]) => {
              for (const nextUser of list) {
                if (!nextUser.username || nextUser.id === user.id || seen.has(nextUser.id)) {
                  continue;
                }

                if (
                  normalizedQuery &&
                  !nextUser.username.toLowerCase().includes(normalizedQuery) &&
                  !(nextUser.name || '').toLowerCase().includes(normalizedQuery)
                ) {
                  continue;
                }

                seen.add(nextUser.id);
                merged.push({
                  kind: 'user',
                  id: nextUser.id,
                  username: nextUser.username,
                  name: nextUser.name,
                  avatarUrl: nextUser.avatarUrl,
                });
              }
            };

            filterAndPush(followers);
            filterAndPush(globalResults);

            const nextSuggestions = merged.slice(0, 15);
            setSuggestions(nextSuggestions);
            setShowSuggestions(nextSuggestions.length > 0);
          } catch (error) {
            console.error('Failed to load mention suggestions', error);
            setSuggestions([]);
            setShowSuggestions(false);
          }
        }, 300);
        return;
      }

      setSuggestions([]);
      setShowSuggestions(false);
    },
    [user],
  );

  const insertMention = (suggestion: MentionSuggestion) => {
    const textBeforeCursor = caption.slice(0, cursorPosition);
    const textAfterCursor = caption.slice(cursorPosition);

    if (suggestion.kind === 'command') {
      const commandStartIndex = textBeforeCursor.lastIndexOf('@@');
      if (commandStartIndex !== -1) {
        setCaption(textBeforeCursor.slice(0, commandStartIndex) + `${suggestion.token} ` + textAfterCursor);
      }
    } else {
      const mentionStartIndex = textBeforeCursor.lastIndexOf('@');
      if (mentionStartIndex !== -1) {
        setCaption(textBeforeCursor.slice(0, mentionStartIndex) + `@${suggestion.username} ` + textAfterCursor);
      }
    }

    setShowSuggestions(false);
    setSuggestions([]);
  };

  const removeMedia = (index: number) => {
    setMediaFiles((prev) => {
      const next = [...prev];
      const [removed] = next.splice(index, 1);
      if (removed) URL.revokeObjectURL(removed.preview);
      return next;
    });
  };

  const resetComposer = () => {
    setCaption('');
    setAiDraft(null);
    mediaFilesRef.current.forEach((media) => URL.revokeObjectURL(media.preview));
    mediaFilesRef.current = [];
    setMediaFiles([]);
    setShowSuggestions(false);
    setSuggestions([]);
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
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

  const generateCaptionDraft = async (prompt: string) => {
    const normalizedPrompt = prompt.trim();
    if (!normalizedPrompt) {
      toast.error('Vui lòng nhập vài từ khóa hoặc ý tưởng để AI viết caption.');
      return;
    }

    setLastCaptionPrompt(normalizedPrompt);
    setAiAction('caption');
    try {
      const result = await postService.generateCaption(normalizedPrompt);
      setAiDraft(result.text);
      if (result.meta?.degraded) {
        toast.success('AI đang bận, đã tạo bản nháp tạm dựa trên chủ đề.');
      } else {
        toast.success('AI đã viết xong bản nháp.');
      }
    } catch (error) {
      toast.error(getApiMessage(error, 'AI hiện tại đang bị lỗi. Vui lòng thử lại sau.'));
    } finally {
      setAiAction(null);
    }
  };

  const handleAISuggest = () => {
    const normalizedPrompt = caption.trim();
    if (!normalizedPrompt) {
      setIsPromptOpen(true);
      return;
    }
    void generateCaptionDraft(normalizedPrompt);
  };

  const handleRetryCaption = () => {
    const retryPrompt = lastCaptionPrompt || caption.trim() || aiDraft || '';
    void generateCaptionDraft(retryPrompt);
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
        toast.success('Không có hashtag nào mới được thêm vào.');
      } else {
        setCaption(updatedCaption);
        setHashtagNotice(`Đã thêm ${tags.length} hashtag gợi ý`);
        toast.success(result.meta?.degraded ? 'Đã thêm hashtag gợi ý tạm.' : 'Đã thêm hashtag đề xuất.');
      }
    } catch (error) {
      toast.error(getApiMessage(error, 'Không thể gợi ý hashtag lúc này.'));
    } finally {
      setAiAction(null);
    }
  };

  const placeholder = useMemo(
    () => (caption.trim() ? 'Viết một vài suy nghĩ...' : typedPlaceholder),
    [caption, typedPlaceholder],
  );

  return (
    <div className="surface-card overflow-hidden rounded-xl">
      <form onSubmit={handleSubmit} data-testid="create-post-form">
        <div className="px-4 py-4">
          <div className="flex items-start gap-3">
            <Avatar src={user?.avatarUrl} name={user?.name} username={user?.username} size="md" ring />

            <div className="relative min-w-0 flex-1">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-[var(--app-text)]">
                    {user?.username || user?.name || 'Bạn'}
                  </p>
                  <p className="text-xs text-[var(--app-muted)]">
                    Chia sẻ ảnh, video hoặc trạng thái với cộng đồng của bạn.
                  </p>
                </div>
                <span className="font-mono text-xs font-medium tabular-nums text-[var(--app-muted)]">
                  {mediaFiles.length}/10
                </span>
              </div>

              <div className="relative mt-3 rounded-lg border border-[var(--app-border)] bg-[var(--app-bg-soft)] px-4 py-3">
                <textarea
                  value={caption}
                  onChange={handleTextChange}
                  placeholder={placeholder}
                  data-testid="create-post-caption"
                  className="min-h-[60px] w-full resize-none bg-transparent text-sm leading-6 text-[var(--app-text)] placeholder:text-[var(--app-muted)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--app-primary)]"
                  rows={2}
                  name="caption"
                  autoComplete="off"
                  spellCheck={false}
                />

                {isCaptionLoading ? (
                  <div className="pointer-events-none absolute inset-2 rounded-lg bg-[linear-gradient(90deg,transparent,rgba(255,255,255,0.42),transparent)] bg-[length:200%_100%] animate-shimmer" />
                ) : null}

                <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-[var(--app-border)] pt-3">
                  <p className="text-xs text-[var(--app-muted)]">
                    Nhắc đến ai đó bằng <span className="font-semibold">@username</span> hoặc dùng{' '}
                    <span className="font-semibold">@@followers</span> để tag người theo dõi.
                  </p>
                  <span className="font-mono text-xs tabular-nums text-[var(--app-muted)]">
                    {caption.trim().length} ký tự
                  </span>
                </div>
              </div>

              {aiDraft ? (
                <motion.div
                  className="float-in glass-panel mt-3 rounded-xl border border-[var(--app-border)] p-4"
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
                >
                  <div className="flex items-start gap-3">
                    <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[var(--app-primary-soft)] text-[var(--app-primary)]">
                      <Sparkle size={18} weight="fill" aria-hidden="true" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--app-muted)]">
                        Bản nháp AI
                      </p>
                      <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-[var(--app-text)]">{aiDraft}</p>
                      <div className="mt-3 flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            setCaption(aiDraft);
                            setAiDraft(null);
                          }}
                          className="btn-tactile spring-ease rounded-md bg-[var(--app-primary)] px-3 py-1.5 text-xs font-semibold text-white hover:bg-[var(--app-primary-strong)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--app-primary)]"
                        >
                          Áp dụng
                        </button>
                        <button
                          type="button"
                          onClick={handleRetryCaption}
                          disabled={isAnyAILoading}
                          className="btn-tactile spring-ease rounded-md border border-[var(--app-border)] px-3 py-1.5 text-xs font-semibold text-[var(--app-text)] hover:bg-[var(--app-bg-soft)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--app-primary)] disabled:opacity-50"
                        >
                          Thử lại
                        </button>
                        <button
                          type="button"
                          onClick={() => setAiDraft(null)}
                          className="btn-tactile spring-ease rounded-md px-3 py-1.5 text-xs font-semibold text-[var(--app-muted)] hover:bg-[var(--app-bg-soft)] hover:text-[var(--app-text)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--app-primary)]"
                        >
                          Bỏ qua
                        </button>
                      </div>
                    </div>
                  </div>
                </motion.div>
              ) : null}

              {hashtagNotice ? (
                <div className="float-in mt-2 inline-flex rounded-full bg-[var(--app-primary-soft)] px-3 py-1 text-xs font-semibold text-[var(--app-primary)]">
                  {hashtagNotice}
                </div>
              ) : null}

              {showSuggestions && suggestions.length > 0 ? (
                <div className="surface-card absolute left-0 top-full z-50 mt-2 w-full overflow-hidden rounded-lg sm:max-w-[360px]">
                  {suggestions.map((suggestion) => (
                    <button
                      key={suggestion.id}
                      type="button"
                      onClick={() => insertMention(suggestion)}
                      className="spring-ease flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-[var(--app-bg-soft)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--app-primary)]"
                    >
                      {suggestion.kind === 'user' ? (
                        <Avatar
                          src={suggestion.avatarUrl}
                          name={suggestion.name}
                          username={suggestion.username}
                          size="sm"
                        />
                      ) : (
                        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[var(--app-primary-soft)] text-xs font-semibold text-[var(--app-primary)]">
                          @@
                        </div>
                      )}

                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold text-[var(--app-text)]">
                          {suggestion.kind === 'user' ? suggestion.username : suggestion.label}
                        </p>
                        <p className="truncate text-sm text-[var(--app-muted)]">
                          {suggestion.kind === 'user'
                            ? suggestion.name || 'Tài khoản người dùng'
                            : suggestion.description}
                        </p>
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
                <div key={media.preview} className="relative overflow-hidden rounded-lg bg-[var(--app-text)]">
                  {media.type === 'IMAGE' ? (
                    <img src={media.preview} alt="" className="aspect-square w-full object-cover" />
                  ) : (
                    <video src={media.preview} className="aspect-square w-full object-cover" />
                  )}
                  <button
                    type="button"
                    onClick={() => removeMedia(index)}
                    className="absolute right-2 top-2 flex h-7 w-7 items-center justify-center rounded-full bg-[rgba(28,30,33,0.72)] text-xs font-semibold text-white spring-ease hover:bg-[rgba(28,30,33,0.88)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--app-primary)]"
                    aria-label="Xóa tệp khỏi bài viết"
                  >
                    <X size={14} weight="bold" aria-hidden="true" />
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
              name="media"
            />

            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={mediaFiles.length >= 10 || isLoading}
              className="btn-tactile spring-ease inline-flex min-h-[38px] items-center gap-2 rounded-md border border-[var(--app-border)] bg-[var(--app-surface)] px-3 text-sm font-medium text-[var(--app-text)] hover:bg-[var(--app-bg-soft)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--app-primary)] disabled:opacity-40"
            >
              <ImageSquare size={20} aria-hidden="true" />
              Thêm tệp
            </button>

            <button
              type="button"
              onClick={handleHashtagSuggest}
              disabled={isAnyAILoading || !caption.trim()}
              className="btn-tactile spring-ease inline-flex min-h-[38px] items-center gap-2 rounded-md px-2 text-sm font-semibold text-[var(--app-primary)] hover:bg-[var(--app-primary-soft)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--app-primary)] disabled:opacity-40"
            >
              {isHashtagLoading ? (
                <span className="skeleton h-4 w-4 rounded-full" aria-hidden="true" />
              ) : (
                <Hash size={18} weight="bold" aria-hidden="true" />
              )}
              Gợi ý hashtag
            </button>

            <button
              type="button"
              onClick={handleAISuggest}
              disabled={isAnyAILoading}
              className="btn-tactile spring-ease inline-flex min-h-[38px] items-center gap-2 rounded-md px-2 text-sm font-semibold text-[var(--app-primary)] hover:bg-[var(--app-primary-soft)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--app-primary)] disabled:opacity-40"
            >
              <motion.span
                animate={isCaptionLoading ? { rotate: 360, opacity: [0.45, 1, 0.45] } : { rotate: 0, opacity: 1 }}
                transition={isCaptionLoading ? { repeat: Infinity, duration: 1.2, ease: 'linear' } : { duration: 0.2 }}
                aria-hidden="true"
              >
                <Sparkle size={18} weight="fill" />
              </motion.span>
              Viết bằng AI
            </button>
          </div>

          <button
            type="submit"
            disabled={isLoading || !caption.trim()}
            data-testid="create-post-submit"
            className="btn-tactile spring-ease inline-flex min-h-[38px] items-center justify-center rounded-md bg-[var(--app-primary)] px-4 text-sm font-semibold text-white hover:bg-[var(--app-primary-strong)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--app-primary)] disabled:bg-[var(--app-border)] disabled:text-[var(--app-muted)] disabled:hover:bg-[var(--app-border)]"
          >
            {isLoading ? <span className="skeleton h-3 w-16" /> : 'Chia sẻ'}
          </button>
        </div>
      </form>

      <PromptDialog
        open={isPromptOpen}
        title="AI nên viết về điều gì?"
        description="Nhập chủ đề ngắn, ví dụ: chuyến đi cuối tuần, review đồ ăn, hoặc cảm xúc hôm nay."
        label="Chủ đề caption"
        placeholder="Ví dụ: một buổi cà phê yên tĩnh sau giờ học"
        confirmLabel="Tạo bản nháp"
        onCancel={() => setIsPromptOpen(false)}
        onConfirm={(value) => {
          setIsPromptOpen(false);
          void generateCaptionDraft(value);
        }}
      />
    </div>
  );
};
