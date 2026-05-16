import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface ChatMarkdownProps {
  content: string;
  isMine: boolean;
}

const ChatMarkdown: React.FC<ChatMarkdownProps> = ({ content, isMine }) => (
  <ReactMarkdown
    remarkPlugins={[remarkGfm]}
    components={{
      p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,
      strong: ({ children }) => <strong className="font-bold">{children}</strong>,
      em: ({ children }) => <em className="italic">{children}</em>,
      ul: ({ children }) => <ul className="my-2 ml-4 list-disc space-y-1">{children}</ul>,
      ol: ({ children }) => <ol className="my-2 ml-4 list-decimal space-y-1">{children}</ol>,
      li: ({ children }) => <li className="leading-6">{children}</li>,
      h1: ({ children }) => <h1 className="mb-2 mt-3 text-base font-bold first:mt-0">{children}</h1>,
      h2: ({ children }) => <h2 className="mb-2 mt-3 text-sm font-bold first:mt-0">{children}</h2>,
      h3: ({ children }) => <h3 className="mb-1 mt-2 text-sm font-semibold first:mt-0">{children}</h3>,
      a: ({ href, children }) => (
        <a href={href} className={isMine ? 'underline font-semibold hover:opacity-80' : 'underline text-[var(--app-primary)] hover:text-[var(--app-primary-strong)]'} target="_blank" rel="noreferrer">{children}</a>
      ),
      code: ({ children }) => (
        <code className={`rounded px-1.5 py-0.5 font-mono text-xs ${isMine ? 'bg-white/20 text-white' : 'bg-[var(--app-bg-soft)] text-[var(--app-text)]'}`}>{children}</code>
      ),
      pre: ({ children }) => (
        <pre className={`my-2 overflow-x-auto rounded-lg p-3 text-xs ${isMine ? 'bg-[rgba(28,30,33,0.2)] text-white' : 'bg-[var(--app-bg-soft)] text-[var(--app-text)]'}`}>{children}</pre>
      ),
      blockquote: ({ children }) => (
        <blockquote className={`my-2 border-l-4 pl-3 italic ${isMine ? 'border-white/30 text-white/80' : 'border-[var(--app-border)] text-[var(--app-muted)]'}`}>{children}</blockquote>
      ),
      hr: () => <hr className={`my-3 ${isMine ? 'border-white/20' : 'border-[var(--app-border)]'}`} />,
    }}
  >
    {content}
  </ReactMarkdown>
);

export default ChatMarkdown;
