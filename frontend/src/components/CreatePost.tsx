import React, { useState, useRef } from 'react';
import toast from 'react-hot-toast';
import { postService } from '../services/post.service';
import { useAuth } from '../contexts/AuthContext';
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
  const [isLoading, setIsLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (mediaFiles.length + files.length > 10) {
      toast.error('Maximum 10 media allowed');
      return;
    }

    const newMedia: MediaDraft[] = files.map((file) => ({
      file,
      preview: URL.createObjectURL(file),
      type: file.type.startsWith('video') ? 'VIDEO' : 'IMAGE',
    }));

    setMediaFiles((prev) => [...prev, ...newMedia]);
  };

  const removeMedia = (index: number) => {
    setMediaFiles((prev) => {
      const newMedia = [...prev];
      URL.revokeObjectURL(newMedia[index].preview);
      newMedia.splice(index, 1);
      return newMedia;
    });
  };

  const uploadMedia = async (file: File): Promise<string> => {
    return postService.uploadMedia(file);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!caption.trim()) {
      toast.error('Please write something');
      return;
    }

    setIsLoading(true);
    try {
      let uploadedMedia;
      if (mediaFiles.length > 0) {
        uploadedMedia = await Promise.all(
          mediaFiles.map(async (m) => ({
            url: await uploadMedia(m.file),
            type: m.type,
          })),
        );
      }

      await postService.createPost({
        caption,
        media: uploadedMedia,
      });

      setCaption('');
      mediaFiles.forEach((m) => URL.revokeObjectURL(m.preview));
      setMediaFiles([]);

      toast.success('Post created!');
      onPostCreated?.();
    } catch {
      toast.error('Failed to create post');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="rounded-xl border border-neutral-200 bg-white">
      <form onSubmit={handleSubmit}>
        <div className="flex items-start gap-3 px-4 py-4">
          <Avatar src={user?.avatarUrl} name={user?.name} username={user?.username} size="sm" />
          <textarea
            value={caption}
            onChange={(e) => setCaption(e.target.value)}
            placeholder="Write a caption..."
            className="min-h-[72px] w-full resize-none border-none bg-transparent text-sm text-neutral-800 outline-none placeholder:text-neutral-500"
            rows={3}
          />
        </div>

        {mediaFiles.length > 0 ? (
          <div className="grid grid-cols-3 gap-2 px-4 pb-3">
            {mediaFiles.map((m, index) => (
              <div key={index} className="relative overflow-hidden rounded-lg border border-neutral-200">
                {m.type === 'IMAGE' ? (
                  <img src={m.preview} alt={`Upload ${index + 1}`} className="h-28 w-full object-cover" />
                ) : (
                  <video src={m.preview} className="h-28 w-full object-cover" />
                )}
                <button
                  type="button"
                  onClick={() => removeMedia(index)}
                  aria-label={`Remove media ${index + 1}`}
                  className="absolute right-2 top-2 rounded-full bg-black/60 px-2 py-0.5 text-xs font-semibold text-white"
                >
                  x
                </button>
              </div>
            ))}
          </div>
        ) : null}

        <div className="flex items-center justify-between border-t border-neutral-200 px-4 py-3">
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
            disabled={mediaFiles.length >= 10 || isLoading}
            className="text-sm font-medium text-neutral-600 transition hover:text-neutral-900 disabled:opacity-50"
          >
            Add media
          </button>
          <button
            type="submit"
            disabled={isLoading || !caption.trim()}
            className="rounded-full bg-blue-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-600 disabled:opacity-50"
          >
            {isLoading ? 'Sharing...' : 'Share'}
          </button>
        </div>
      </form>
    </div>
  );
};
