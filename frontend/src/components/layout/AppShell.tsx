import React from 'react';
import { NavLink, Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { NotificationBell } from '../NotificationBell';
import { Avatar } from '../common/Avatar';

interface AppShellProps {
  title: string;
  description?: string;
  action?: React.ReactNode;
  aside?: React.ReactNode;
  children: React.ReactNode;
}

const navItems = [
  { to: '/feed', label: 'Feed', badge: 'FD' },
  { to: '/explore', label: 'Explore', badge: 'EX' },
  { to: '/messages', label: 'Messages', badge: 'MS' },
  { to: '/notifications', label: 'Alerts', badge: 'AL' },
];

const joinClasses = (...values: Array<string | false | null | undefined>) =>
  values.filter(Boolean).join(' ');

export const AppShell: React.FC<AppShellProps> = ({
  title,
  description,
  action,
  aside,
  children,
}) => {
  const { user, logout } = useAuth();
  const profilePath = user?.username ? `/${user.username}` : '/feed';

  return (
    <div className="min-h-screen text-slate-900">
      <div className="mx-auto max-w-7xl px-4 py-4 lg:px-6 lg:py-6">
        <div className="grid gap-6 xl:grid-cols-[280px,minmax(0,1fr),320px]">
          <aside className="xl:sticky xl:top-6 xl:self-start">
            <div className="rounded-[32px] border border-white/70 bg-white/80 p-5 shadow-[0_30px_80px_-50px_rgba(15,23,42,0.45)] backdrop-blur">
              <div className="rounded-[28px] bg-[radial-gradient(circle_at_top_left,_rgba(251,146,60,0.18),_transparent_45%),radial-gradient(circle_at_bottom_right,_rgba(34,211,238,0.16),_transparent_45%),linear-gradient(135deg,_rgba(255,255,255,0.94),_rgba(248,250,252,0.92))] p-5">
                <div className="flex items-center gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-900 text-sm font-semibold tracking-[0.2em] text-white">
                    DS
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Social Thesis</p>
                    <h2 className="text-xl font-semibold text-slate-900">DATN Social</h2>
                  </div>
                </div>

                <nav className="mt-6 space-y-2">
                  {navItems.map((item) => (
                    <NavLink
                      key={item.to}
                      to={item.to}
                      className={({ isActive }) =>
                        joinClasses(
                          'flex items-center justify-between rounded-2xl px-4 py-3 transition-all duration-200',
                          isActive
                            ? 'bg-slate-900 text-white shadow-lg shadow-slate-900/15'
                            : 'bg-white/80 text-slate-600 hover:bg-white hover:text-slate-900',
                        )
                      }
                    >
                      <span className="font-medium">{item.label}</span>
                      <span className="rounded-xl border border-current/10 px-2 py-1 text-[10px] font-semibold tracking-[0.2em] opacity-80">
                        {item.badge}
                      </span>
                    </NavLink>
                  ))}

                  <NavLink
                    to={profilePath}
                    className={({ isActive }) =>
                      joinClasses(
                        'flex items-center justify-between rounded-2xl px-4 py-3 transition-all duration-200',
                        isActive
                          ? 'bg-slate-900 text-white shadow-lg shadow-slate-900/15'
                          : 'bg-white/80 text-slate-600 hover:bg-white hover:text-slate-900',
                      )
                    }
                  >
                    <span className="font-medium">Profile</span>
                    <span className="rounded-xl border border-current/10 px-2 py-1 text-[10px] font-semibold tracking-[0.2em] opacity-80">
                      PF
                    </span>
                  </NavLink>
                </nav>

                <div className="mt-6 rounded-[24px] border border-slate-200/70 bg-white/90 p-4">
                  <div className="flex items-center gap-3">
                    <Avatar src={user?.avatarUrl} name={user?.name} username={user?.username} size="lg" />
                    <div className="min-w-0">
                      <p className="truncate font-semibold text-slate-900">{user?.name || user?.username || 'You'}</p>
                      <p className="truncate text-sm text-slate-500">
                        {user?.username ? `@${user.username}` : user?.email || 'Profile is still being set up'}
                      </p>
                    </div>
                  </div>

                  <div className="mt-4 grid grid-cols-2 gap-3 text-sm text-slate-600">
                    <div className="rounded-2xl bg-slate-50 p-3">
                      <p className="text-xs uppercase tracking-[0.25em] text-slate-400">Followers</p>
                      <p className="mt-1 text-lg font-semibold text-slate-900">{user?.followersCount ?? 0}</p>
                    </div>
                    <div className="rounded-2xl bg-slate-50 p-3">
                      <p className="text-xs uppercase tracking-[0.25em] text-slate-400">Following</p>
                      <p className="mt-1 text-lg font-semibold text-slate-900">{user?.followingCount ?? 0}</p>
                    </div>
                  </div>

                  <div className="mt-4 flex items-center justify-between gap-3">
                    <Link
                      to={profilePath}
                      className="rounded-2xl bg-slate-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-800"
                    >
                      Open profile
                    </Link>
                    <button
                      onClick={logout}
                      className="rounded-2xl border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 transition hover:border-slate-300 hover:text-slate-900"
                    >
                      Sign out
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </aside>

          <div className="space-y-6">
            <header className="rounded-[32px] border border-white/70 bg-white/80 p-5 shadow-[0_30px_80px_-50px_rgba(15,23,42,0.45)] backdrop-blur lg:p-6">
              <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                <div>
                  <p className="text-xs uppercase tracking-[0.35em] text-slate-400">Workspace</p>
                  <h1 className="mt-2 text-3xl font-semibold tracking-tight text-slate-900">{title}</h1>
                  {description ? (
                    <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-500">{description}</p>
                  ) : null}
                </div>
                <div className="flex items-center gap-3 self-start">
                  {action}
                  <NotificationBell />
                </div>
              </div>
            </header>

            <div className="space-y-6">{children}</div>
          </div>

          <aside className="hidden xl:block xl:sticky xl:top-6 xl:self-start">
            {aside ? (
              aside
            ) : (
              <div className="rounded-[32px] border border-white/70 bg-white/80 p-5 shadow-[0_30px_80px_-50px_rgba(15,23,42,0.45)] backdrop-blur">
                <div className="rounded-[28px] bg-slate-900 p-6 text-white">
                  <p className="text-xs uppercase tracking-[0.35em] text-white/60">Control room</p>
                  <h3 className="mt-3 text-2xl font-semibold">Keep the project moving.</h3>
                  <p className="mt-3 text-sm leading-6 text-white/70">
                    Use the feed to publish, explore to discover users and hashtags, alerts for engagement, and messages to keep conversations live.
                  </p>
                </div>
              </div>
            )}
          </aside>
        </div>
      </div>
    </div>
  );
};
