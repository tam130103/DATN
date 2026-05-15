import React from 'react';
import { Link } from 'react-router-dom';
import { BookmarkSimple, ChatCircle, Heart } from '@phosphor-icons/react';
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
    <div className="relative min-h-[100dvh] bg-[var(--app-bg)] px-4 py-10 sm:px-6 lg:px-10">
      <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
        <div className="absolute -right-32 -top-40 h-96 w-96 rounded-full bg-[var(--app-primary-soft)] blur-3xl opacity-70" />
        <div className="absolute -bottom-40 -left-32 h-80 w-80 rounded-full bg-[rgba(0,149,246,0.08)] blur-3xl opacity-70" />
      </div>
      <div className="mx-auto flex min-h-[calc(100dvh-5rem)] max-w-[935px] items-center justify-center gap-12">
        <section className="hidden flex-1 items-center justify-center lg:flex">
          <div className="relative phone-float">
            <div className="absolute -bottom-6 -left-10 h-72 w-72 rounded-full bg-[var(--app-primary-soft)] opacity-70 blur-3xl" />
            <div className="relative h-[540px] w-[280px] overflow-hidden rounded-3xl border-[8px] border-[var(--app-text)] bg-white p-3 shadow-[var(--app-shadow-lg)]">
              <div className="mx-auto h-1.5 w-20 rounded-full bg-slate-200" />

              <div className="mt-3 flex items-center justify-between px-1">
                <BrandLogo variant="full" className="h-auto w-[96px] object-contain" />
                <div className="flex items-center gap-3 text-[var(--app-text)]">
                  <Heart size={20} aria-hidden="true" />
                  <ChatCircle size={20} aria-hidden="true" />
                </div>
              </div>

              <div className="mt-4 flex gap-2 overflow-hidden">
                {previewStories.map((story) => (
                  <div key={story} className="flex w-[52px] flex-col items-center gap-1.5">
                    <div className="rounded-full bg-[var(--app-primary)] p-[2px]">
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

              <div className="mt-4 overflow-hidden rounded-2xl border border-[var(--app-border)] bg-white">
                <div className="flex items-center gap-2 border-b border-[var(--app-border)] px-3 py-2.5">
                  <div className="rounded-full bg-[var(--app-primary)] p-[2px]">
                    <div className="h-7 w-7 rounded-full border-2 border-white bg-[#efefef]" />
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-[var(--app-text)]">datn.social</p>
                    <p className="text-[10px] text-[var(--app-muted)]">Hanoi</p>
                  </div>
                </div>

                <div className="aspect-[4/5] bg-[var(--app-bg-soft)]" />

                <div className="px-3 py-2.5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3 text-[var(--app-text)]">
                      <Heart size={20} aria-hidden="true" />
                      <ChatCircle size={20} aria-hidden="true" />
                    </div>
                    <BookmarkSimple size={20} aria-hidden="true" />
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

        <section className="w-full max-w-[420px]">
          <div className="glass-panel rounded-lg border border-[var(--app-border)] px-8 py-10 text-center sm:px-10">

            <p className="mt-6 text-[10px] font-semibold uppercase tracking-[0.22em] text-[var(--app-muted)]">
              {badge}
            </p>
            <h1 className="mt-3 text-[28px] font-semibold leading-8 text-[var(--app-text)]">
              {title}
            </h1>
            <p className="mt-3 text-sm leading-6 text-[var(--app-muted-strong)]">{description}</p>

            <div className="mt-8 text-left">{children}</div>
          </div>

          <div className="glass-panel mt-3 rounded-lg border border-[var(--app-border)] px-6 py-4 text-center text-sm text-[var(--app-muted-strong)]">
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
