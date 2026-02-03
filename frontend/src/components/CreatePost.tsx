import React, { useState, useRef } from 'react';
import { postService } from '../services/post.service';
import toast from 'react-hot-toast';

interface CreatePostProps {
  onPostCreated?: () => void;
}

export const CreatePost: React.FC<CreatePostProps> = ({ onPostCreated }) => {
  const [caption, setCaption] = useState('');
  const [mediaFiles, setMediaFiles] = useState<Array<{ file: File; preview: string; type: 'IMAGE' | 'VIDEO' }>>([]);
  const [isLoading, setIsLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (mediaFiles.length + files.length > 10) {
      toast.error('Maximum 10 media allowed');
      return;
    }

    const newMedia = files.map((file) => ({
      file,
      preview: URL.createObjectURL(file),
      type: file.type.startsWith('video') ? 'VIDEO' : 'IMAGE' as const,
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

  // Simulate upload (replace with actual Cloudinary/S3 upload)
  const uploadMedia = async (file: File): Promise<string> => {
    // TODO: Replace with actual Cloudinary/S3 upload
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve(URL.createObjectURL(file));
      }, 500);
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (mediaFiles.length === 0) {
      toast.error('At least 1 media is required');
      return;
    }

    setIsLoading(true);
    try {
      // Upload all media
      const uploadedMedia = await Promise.all(
        mediaFiles.map(async (m) => ({
          url: await uploadMedia(m.file),
          type: m.type,
        })),
      );

      await postService.createPost({
        caption,
        media: uploadedMedia,
      });

      // Reset form
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
    <div className="bg-white rounded-lg shadow p-4 mb-4">
      <form onSubmit={handleSubmit}>
        <textarea
          value={caption}
          onChange={(e) => setCaption(e.target.value)}
          placeholder="Write a caption... #hashtags"
          className="w-full p-3 border rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
          rows={3}
        />

        {mediaFiles.length > 0 && (
          <div className="mt-3 grid grid-cols-3 gap-2">
            {mediaFiles.map((m, index) => (
              <div key={index} className="relative aspect-square">
                {m.type === 'IMAGE' ? (
                  <img src={m.preview} alt="" className="w-full h-full object-cover rounded" />
                ) : (
                  <video src={m.preview} className="w-full h-full object-cover rounded" />
                )}
                <button
                  type="button"
                  onClick={() => removeMedia(index)}
                  className="absolute top-1 right-1 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm"
                >
                  ×
                </button>
                <span className="absolute bottom-1 left-1 bg-black bg-opacity-50 text-white text-xs px-2 rounded">
                  {index + 1}
                </span>
              </div>
            ))}
          </div>
        )}

        <div className="mt-3 flex items-center justify-between">
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
            className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            📷 Add Media ({mediaFiles.length}/10)
          </button>

          <button
            type="submit"
            disabled={isLoading || mediaFiles.length === 0}
            className="px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? 'Posting...' : 'Post'}
          </button>
        </div>
      </form>
    </div>
  );
};
