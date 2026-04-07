import React from 'react';
import { Link } from 'react-router-dom';
import { BrandLogo } from '../branding/BrandLogo';

interface AuthLayoutProps {
  badge: string;
  title: string;
  description: string;
  footerText: string;
  footerLinkLabel: string;
  footerLinkTo: string;
  children: React.ReactNode;
}

const previewStories = ['Campus', 'Clubs', 'Projects', 'Moments'];

const HeartIcon = () => (
  <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.9">
    <path d="M16.792 3.904A4.989 4.989 0 0121.5 9.122c0 3.072-2.652 4.959-5.197 7.222-2.512 2.243-3.865 3.469-4.303 3.752-.477-.309-1.834-1.527-4.303-3.752C5.152 14.08 2.5 12.194 2.5 9.122a4.989 4.989 0 014.708-5.218 4.21 4.21 0 013.675 1.941c.84 1.175.98 1.763 1.12 1.763s.278-.588 1.11-1.766a4.17 4.17 0 013.679-1.938z" />
  </svg>
);

const MessageIcon = () => (
  <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.9">
    <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" />
  </svg>
);

const SaveIcon = () => (
  <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.9">
    <path d="M20 21l-8-7.56L4 21V3h16v18z" />
  </svg>
);

export const AuthLayout: React.FC<AuthLayoutProps> = ({
  badge,
  title,
  description,
  footerText,
  footerLinkLabel,
  footerLinkTo,
  children,
}) => {
  return (
    <div className="min-h-screen bg-[var(--app-bg)] px-4 py-10 sm:px-6">
      <div className="mx-auto flex min-h-[calc(100vh-5rem)] max-w-[935px] items-center justify-center gap-12">
        <section className="hidden flex-1 items-center justify-center lg:flex">
          <div className="relative">
            <div className="absolute -bottom-6 -left-10 h-72 w-72 rounded-full bg-[radial-gradient(circle,rgba(0,149,246,0.15),transparent_68%)]" />
            <div className="relative h-[540px] w-[280px] overflow-hidden rounded-[38px] border-[8px] border-slate-900 bg-white p-3 shadow-[0_25px_50px_rgba(0,0,0,0.12)]">
              <div className="mx-auto h-1.5 w-20 rounded-full bg-slate-200" />

              <div className="mt-3 flex items-center justify-between px-1">
                <BrandLogo variant="full" className="h-auto w-[96px] object-contain" />
                <div className="flex items-center gap-3 text-[var(--app-text)]">
                  <HeartIcon />
                  <MessageIcon />
                </div>
              </div>

              <div className="mt-4 flex gap-2 overflow-hidden">
                {previewStories.map((story) => (
                  <div key={story} className="flex w-[52px] flex-col items-center gap-1.5">
                    <div className="rounded-full bg-[linear-gradient(135deg,#f9ce34,#ee2a7b,#6228d7)] p-[2px]">
                      <div className="flex h-11 w-11 items-center justify-center rounded-full border-2 border-white bg-[#efefef] text-[10px] font-semibold text-[var(--app-text)]">
                        {story.slice(0, 2)}
                      </div>
                    </div>
                    <p className="w-full truncate text-center text-[10px] text-[var(--app-muted)]">
                      {story}
                    </p>
                  </div>
                ))}
              </div>

              <div className="mt-4 overflow-hidden rounded-[20px] border border-[var(--app-border)] bg-white">
                <div className="flex items-center gap-2 border-b border-[var(--app-border)] px-3 py-2.5">
                  <div className="rounded-full bg-[linear-gradient(135deg,#f9ce34,#ee2a7b,#6228d7)] p-[2px]">
                    <div className="h-7 w-7 rounded-full border-2 border-white bg-[#efefef]" />
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-[var(--app-text)]">datn.social</p>
                    <p className="text-[10px] text-[var(--app-muted)]">Hanoi</p>
                  </div>
                </div>

                <div className="aspect-[4/5] bg-[linear-gradient(160deg,#fdf2f8,#ede9fe,#dbeafe)]" />

                <div className="px-3 py-2.5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3 text-[var(--app-text)]">
                      <HeartIcon />
                      <MessageIcon />
                    </div>
                    <SaveIcon />
                  </div>
                  <p className="mt-2 text-xs font-semibold text-[var(--app-text)]">1,284 lượt thích</p>
                  <p className="mt-1 text-xs leading-5 text-[var(--app-text)] max-h-10 overflow-hidden line-clamp-2">
                    <span className="font-semibold">datn.social</span> Tập trung vào hình ảnh, đơn giản và hướng đến con người.
                  </p>
                  <p className="mt-1 text-[10px] text-[var(--app-muted)]">Xem tất cả 87 bình luận</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="w-full max-w-[360px]">
          <div className="surface-card rounded-[1px] px-8 py-10 text-center sm:px-10">

            <p className="mt-6 text-[10px] font-semibold uppercase tracking-[0.22em] text-[var(--app-muted)]">
              {badge}
            </p>
            <h1 className="mt-3 text-[28px] font-semibold leading-8 text-[var(--app-text)]">
              {title}
            </h1>
            <p className="mt-3 text-sm leading-6 text-[var(--app-muted-strong)]">{description}</p>

            <div className="mt-8 text-left">{children}</div>
          </div>

          <div className="surface-card mt-3 rounded-[1px] px-6 py-4 text-center text-sm text-[var(--app-muted-strong)]">
            {footerText}{' '}
            <Link
              to={footerLinkTo}
              className="font-semibold text-[var(--app-primary)] transition hover:text-[var(--app-primary-strong)]"
            >
              {footerLinkLabel}
            </Link>
          </div>
        </section>
      </div>
    </div>
  );
};
