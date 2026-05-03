import React from 'react';
import { Link } from 'react-router-dom';

interface CommentContentProps {
  content: string;
  onNavigate?: () => void;
}

/**
 * Renders comment text with @mentions as clickable profile links.
 * Mentions are always in @username format (no spaces).
 */
export const CommentContent: React.FC<CommentContentProps> = ({ content, onNavigate }) => {
  return (
    <span className="whitespace-pre-wrap">
      {renderInlineMentions(content, onNavigate)}
    </span>
  );
};

/**
 * Renders inline @username mentions (no spaces) as links.
 */
function renderInlineMentions(text: string, onNavigate?: () => void) {
  // Match @username style mentions (alphanumeric, dots, underscores, Unicode letters)
  const parts = text.split(/(@[\w\u00C0-\u024F\u1E00-\u1EFF.]+)/gu);

  return parts.map((part, index) => {
    if (part.startsWith('@') && part.length > 1) {
      const username = part.slice(1);
      return (
        <Link
          key={index}
          to={`/${encodeURIComponent(username)}`}
          onClick={onNavigate}
          className="font-semibold text-[var(--app-primary)] hover:underline"
        >
          {part}
        </Link>
      );
    }
    return <React.Fragment key={index}>{part}</React.Fragment>;
  });
}
