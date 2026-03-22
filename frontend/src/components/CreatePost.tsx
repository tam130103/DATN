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

  const [showSuggestions, setShowSuggestions] = useState(false);
  const [suggestions, setSuggestions] = useState<User[]>([]);
  const [cursorPosition, setCursorPosition] = useState(0);

  const handleTextChange = async (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const text = e.target.value;
    setCaption(text);
    
    // Check for '@' mention logic
    const cursor = e.target.selectionStart;
    setCursorPosition(cursor);
    
    const textBeforeCursor = text.slice(0, cursor);
    const match = textBeforeCursor.match(/@([a-zA-Z0-9_.]*)$/);
    
    if (match && user) {
      const query = match[1];
      setShowSuggestions(true);
      
      try {
        const following = await userService.getFollowing(user.id, 1, 50);
        const filtered = following.filter(u => 
          (u.username || '').toLowerCase().includes(query.toLowerCase()) || 
          (u.name || '').toLowerCase().includes(query.toLowerCase())
        );
        setSuggestions(filtered);
      } catch (err) {
        console.error('Failed to load suggestions', err);
      }
    } else {
      setShowSuggestions(false);
    }
  };

  const insertMention = (username: string) => {
    const textBeforeCursor = caption.slice(0, cursorPosition);
    const textAfterCursor = caption.slice(cursorPosition);
    
    // Replace the incomplete @mention with the full username
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!caption.trim()) { toast.error('Please write something'); return; }
    setIsLoading(true);
    try {
      let uploadedMedia;
      if (mediaFiles.length > 0) {
        uploadedMedia = await Promise.all(
          mediaFiles.map(async (m) => ({
            url: await postService.uploadMedia(m.file),
            type: m.type,
          })),
        );
      }
      await postService.createPost({ caption, media: uploadedMedia });
      setCaption('');
      mediaFiles.forEach((m) => URL.revokeObjectURL(m.preview));
      setMediaFiles([]);
      toast.success('Post shared!');
      onPostCreated?.();
    } catch {
      toast.error('Failed to create post');
    } finally {
      setIsLoading(false);
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
              placeholder="What's on your mind?"
              data-testid="create-post-caption"
              className="min-h-[56px] w-full resize-none bg-transparent text-sm outline-none placeholder:text-[#8e8e8e]"
              rows={2}
            />
            
            {showSuggestions && suggestions.length > 0 && (
              <div className="absolute left-0 top-full z-50 mt-1 max-h-48 w-full overflow-y-auto rounded-lg border border-[#dbdbdb] bg-white shadow-lg sm:w-64">
                {suggestions.map(u => (
                  <button
                    key={u.id}
                    type="button"
                    onClick={() => insertMention(u.username || u.name || '')}
                    className="flex w-full items-center gap-3 px-3 py-2 text-left hover:bg-gray-100"
                  >
                    <Avatar src={u.avatarUrl} name={u.name} username={u.username} size="sm" />
                    <div className="flex flex-col overflow-hidden">
                      <span className="truncate text-sm font-semibold">{u.username}</span>
                      <span className="truncate text-xs text-[#8e8e8e]">{u.name}</span>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {mediaFiles.length > 0 && (
          <div className="flex gap-2 overflow-x-auto px-3 pb-3">
            {mediaFiles.map((m, index) => (
              <div key={index} className="relative flex-shrink-0">
                {m.type === 'IMAGE' ? (
                  <img src={m.preview} alt="" className="h-20 w-20 rounded-md object-cover" />
                ) : (
                  <video src={m.preview} className="h-20 w-20 rounded-md object-cover" />
                )}
                <button
                  type="button"
                  onClick={() => removeMedia(index)}
                  className="absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-black text-[10px] text-white"
                >×</button>
              </div>
            ))}
          </div>
        )}

        <div className="flex items-center justify-between border-t border-[#efefef] px-3 py-2">
          <input ref={fileInputRef} type="file" accept="image/*,video/*" multiple onChange={handleFileSelect} className="hidden" data-testid="create-post-media-input" />
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
          <button
            type="submit"
            disabled={isLoading || !caption.trim()}
            data-testid="create-post-submit"
            className="rounded-lg bg-[#0095f6] px-4 py-1.5 text-sm font-semibold text-white transition hover:bg-[#1877f2] disabled:opacity-40"
          >
            {isLoading ? 'Sharing...' : 'Share'}
          </button>
        </div>
      </form>
    </div>
  );
};
