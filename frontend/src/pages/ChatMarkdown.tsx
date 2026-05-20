import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import type { ReactNode } from 'react';

const ALLOWED_PROTOCOLS = ['http:', 'https:', 'mailto:'];

function isSafeHref(href?: string): boolean {
  if (!href) return true;
  if (href.startsWith('/')) return true;
  try {
    const url = new URL(href, 'http://placeholder');
    return ALLOWED_PROTOCOLS.includes(url.protocol);
  } catch {
    return false;
  }
}

interface ChatMarkdownProps {
  content: string;
  isMine: boolean;
}

const ChatMarkdown: React.FC<ChatMarkdownProps> = ({ content, isMine }) => (
  <ReactMarkdown
    remarkPlugins={[remarkGfm]}
    components={{
      p: ({ children }: { children?: ReactNode }) => <p className="mb-2 last:mb-0">{children}</p>,
      strong: ({ children }: { children?: ReactNode }) => <strong className="font-bold">{children}</strong>,
      em: ({ children }: { children?: ReactNode }) => <em className="italic">{children}</em>,
      ul: ({ children }: { children?: ReactNode }) => <ul className="my-2 ml-4 list-disc space-y-1">{children}</ul>,
      ol: ({ children }: { children?: ReactNode }) => <ol className="my-2 ml-4 list-decimal space-y-1">{children}</ol>,
      li: ({ children }: { children?: ReactNode }) => <li className="leading-6">{children}</li>,
      h1: ({ children }: { children?: ReactNode }) => <h1 className="mb-2 mt-3 text-base font-bold first:mt-0">{children}</h1>,
      h2: ({ children }: { children?: ReactNode }) => <h2 className="mb-2 mt-3 text-sm font-bold first:mt-0">{children}</h2>,
      h3: ({ children }: { children?: ReactNode }) => <h3 className="mb-1 mt-2 text-sm font-semibold first:mt-0">{children}</h3>,
      a: ({ href, children }: { href?: string; children?: ReactNode }) => {
        if (!isSafeHref(href)) {
          return <span className="cursor-not-allowed opacity-60">{children}</span>;
        }
        return (
          <a
            href={href}
            className={
              isMine
                ? 'underline font-semibold hover:opacity-80'
                : 'underline text-[var(--app-primary)] hover:text-[var(--app-primary-strong)]'
            }
            target="_blank"
            rel="noreferrer"
          >
            {children}
          </a>
        );
      },
      img: () => null,
      code: ({ children }: { children?: ReactNode }) => (
        <code
          className={`rounded px-1.5 py-0.5 font-mono text-xs ${
            isMine ? 'bg-white/20 text-white' : 'bg-[var(--app-bg-soft)] text-[var(--app-text)]'
          }`}
        >
          {children}
        </code>
      ),
      pre: ({ children }: { children?: ReactNode }) => (
        <pre
          className={`my-2 overflow-x-auto rounded-lg p-3 text-xs ${
            isMine
              ? 'bg-[rgba(28,30,33,0.2)] text-white'
              : 'bg-[var(--app-bg-soft)] text-[var(--app-text)]'
          }`}
        >
          {children}
        </pre>
      ),
      blockquote: ({ children }: { children?: ReactNode }) => (
        <blockquote
          className={`my-2 border-l-4 pl-3 italic ${
            isMine
              ? 'border-white/30 text-white/80'
              : 'border-[var(--app-border)] text-[var(--app-muted)]'
          }`}
        >
          {children}
        </blockquote>
      ),
      hr: () => (
        <hr className={`my-3 ${isMine ? 'border-white/20' : 'border-[var(--app-border)]'}`} />
      ),
    }}
  >
    {content}
  </ReactMarkdown>
);

export default ChatMarkdown;