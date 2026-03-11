import React, { useMemo, useRef, useState } from 'react';
import toast from 'react-hot-toast';
import { useAuth } from '../contexts/AuthContext';
import { postService } from '../services/post.service';
import { Avatar } from './common/Avatar';

interface CreatePostProps {
  onPostCreated?: () => void;
}

type MediaDraft = {
  file: File;
  preview: string;
  type: 'IMAGE' | 'VIDEO';
};

export const CreatePost: React.FC<CreatePostProps> = ({ onPostCreated }) => {
  const { user } = useAuth();
  const [caption, setCaption] = useState('');
  const [mediaFiles, setMediaFiles] = useState<MediaDraft[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const helperText = useMemo(() => {
    if (mediaFiles.length === 0) {
      return 'Add up to 10 images or videos. Files are uploaded to the backend before publishing.';
    }
    return `${mediaFiles.length} media item${mediaFiles.length > 1 ? 's' : ''} ready to publish.`;
  }, [mediaFiles.length]);

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    if (mediaFiles.length + files.length > 10) {
      toast.error('Maximum 10 media files per post.');
      return;
    }

    const newMedia: MediaDraft[] = files.map((file) => ({
      file,
      preview: URL.createObjectURL(file),
      type: file.type.startsWith('video/') ? 'VIDEO' : 'IMAGE',
    }));

    setMediaFiles((prev) => [...prev, ...newMedia]);
    event.target.value = '';
  };

  const removeMedia = (index: number) => {
    setMediaFiles((prev) => {
      const next = [...prev];
      URL.revokeObjectURL(next[index].preview);
      next.splice(index, 1);
      return next;
    });
  };

  const resetForm = () => {
    setCaption('');
    mediaFiles.forEach((item) => URL.revokeObjectURL(item.preview));
    setMediaFiles([]);
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    const trimmedCaption = caption.trim();
    if (!trimmedCaption && mediaFiles.length === 0) {
      toast.error('Write something or attach media before publishing.');
      return;
    }

    setIsSubmitting(true);
    try {
      const uploadedMedia = mediaFiles.length > 0
        ? await postService.uploadMedia(mediaFiles.map((item) => item.file))
        : undefined;

      await postService.createPost({
        caption: trimmedCaption,
        media: uploadedMedia?.map((item) => ({ url: item.url, type: item.type })),
      });

      resetForm();
      toast.success('Post published successfully.');
      onPostCreated?.();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to publish post.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <section className="rounded-[32px] border border-white/70 bg-white/85 p-5 shadow-[0_24px_80px_-40px_rgba(15,23,42,0.28)] backdrop-blur lg:p-6">
      <div className="flex items-center gap-3">
        <Avatar src={user?.avatarUrl} name={user?.name} username={user?.username} size="lg" />
        <div>
          <p className="text-xs uppercase tracking-[0.35em] text-slate-400">Composer</p>
          <h2 className="mt-1 text-xl font-semibold text-slate-900">Share a new update</h2>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="mt-5 space-y-5">
        <textarea
          value={caption}
          onChange={(event) => setCaption(event.target.value)}
          placeholder="What happened today? Add context, a takeaway, or a hashtag trail for discovery."
          rows={4}
          className="w-full rounded-[28px] border border-slate-200 bg-slate-50 px-5 py-4 text-sm leading-7 text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-slate-300 focus:bg-white focus:ring-4 focus:ring-slate-900/5"
        />

        <div className="rounded-[28px] border border-dashed border-slate-200 bg-slate-50/80 p-4">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-sm font-medium text-slate-900">Media attachments</p>
              <p className="mt-1 text-sm text-slate-500">{helperText}</p>
            </div>
            <div className="flex items-center gap-3">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*,video/*"
                multiple
                onChange={handleFileSelect}
                className="hidden"
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={isSubmitting || mediaFiles.length >= 10}
                className="rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 transition hover:border-slate-300 hover:text-slate-900 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Attach media
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="rounded-2xl bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isSubmitting ? 'Publishing...' : 'Publish post'}
              </button>
            </div>
          </div>

          {mediaFiles.length > 0 ? (
            <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {mediaFiles.map((media, index) => (
                <div key={`${media.file.name}-${index}`} className="relative overflow-hidden rounded-[24px] bg-slate-900">
                  {media.type === 'IMAGE' ? (
                    <img src={media.preview} alt={media.file.name} className="h-52 w-full object-cover opacity-95" />
                  ) : (
                    <video src={media.preview} className="h-52 w-full object-cover opacity-95" />
                  )}
                  <div className="absolute inset-x-0 bottom-0 flex items-center justify-between bg-gradient-to-t from-black/70 to-transparent px-4 py-3 text-sm text-white">
                    <span className="truncate pr-3">{media.file.name}</span>
                    <button
                      type="button"
                      onClick={() => removeMedia(index)}
                      className="rounded-xl bg-white/15 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] transition hover:bg-white/25"
                    >
                      Remove
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : null}
        </div>
      </form>
    </section>
  );
};
