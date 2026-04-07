import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';

interface PostCaptionProps {
  text?: string | null;
  className?: string;
  textClassName?: string;
  collapsedLength?: number;
  collapsedLines?: number;
  prefixLabel?: string;
  prefixTo?: string;
}

const TOKEN_REGEX = /([#][a-zA-Z0-9_]+|[@][a-zA-Z0-9_.]+)/g;

const renderRichText = (text: string) =>
  text.split(TOKEN_REGEX).map((part, index) => {
    if (part.startsWith('#')) {
      const tag = part.slice(1).toLowerCase();
      return (
        <Link
          key={`caption-hashtag-${index}`}
          to={`/hashtag/${tag}`}
          className="font-semibold text-[var(--app-primary)] transition hover:text-[var(--app-primary-strong)] hover:underline"
        >
          {part}
        </Link>
      );
    }

    if (part.startsWith('@')) {
      const username = part.slice(1).toLowerCase();
      return (
        <Link
          key={`caption-mention-${index}`}
          to={`/${username}`}
          className="font-semibold text-[var(--app-primary)] transition hover:text-[var(--app-primary-strong)] hover:underline"
        >
          {part}
        </Link>
      );
    }

    return <span key={`caption-text-${index}`}>{part}</span>;
  });

export const PostCaption: React.FC<PostCaptionProps> = ({
  text,
  className = '',
  textClassName = '',
  collapsedLength = 220,
  collapsedLines = 6,
  prefixLabel,
  prefixTo,
}) => {
  const normalizedText = (text ?? '').trimEnd();
  const lineCount = useMemo(() => normalizedText.split(/\r?\n/).length, [normalizedText]);
  const shouldCollapse = normalizedText.length > collapsedLength || lineCount > collapsedLines;
  const [isExpanded, setIsExpanded] = useState(false);

  useEffect(() => {
    setIsExpanded(false);
  }, [normalizedText]);

  const content = useMemo(() => renderRichText(normalizedText), [normalizedText]);

  if (!normalizedText && !prefixLabel) {
    return null;
  }

  return (
    <div className={className}>
      <div
        className={`relative overflow-hidden whitespace-pre-wrap break-words text-sm leading-6 text-[var(--app-text)] ${textClassName}`.trim()}
        style={
          shouldCollapse && !isExpanded
            ? { maxHeight: `${collapsedLines * 1.75}rem` }
            : undefined
        }
      >
        {prefixLabel ? (
          prefixTo ? (
            <Link to={prefixTo} className="mr-1 font-semibold text-[var(--app-text)] hover:underline">
              {prefixLabel}
            </Link>
          ) : (
            <span className="mr-1 font-semibold text-[var(--app-text)]">{prefixLabel}</span>
          )
        ) : null}
        {content}
        {shouldCollapse && !isExpanded ? (
          <div className="pointer-events-none absolute inset-x-0 bottom-0 h-12 bg-gradient-to-t from-white via-white/90 to-transparent" />
        ) : null}
      </div>

      {shouldCollapse ? (
        <button
          type="button"
          onClick={() => setIsExpanded((prev) => !prev)}
          className="mt-2 text-sm font-semibold text-[var(--app-muted)] transition hover:text-[var(--app-text)]"
        >
          {isExpanded ? 'Ẩn bớt' : 'Xem thêm'}
        </button>
      ) : null}
    </div>
  );
};
