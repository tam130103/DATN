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

const joinClasses = (...values: Array<string | false | null | undefined>) =>
  values.filter(Boolean).join(' ');

const HomeIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
    <path d="M3 10.5L12 3l9 7.5" />
    <path d="M5 10v10h14V10" />
  </svg>
);

const ExploreIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
    <circle cx="11" cy="11" r="7" />
    <path d="M20 20l-3.5-3.5" />
  </svg>
);

const MessageIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
    <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" />
  </svg>
);

const HeartIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
    <path d="M20.8 4.6a5.5 5.5 0 00-7.8 0L12 5.6l-1-1a5.5 5.5 0 00-7.8 7.8l1 1 7.8 7.8 7.8-7.8 1-1a5.5 5.5 0 000-7.8z" />
  </svg>
);

const ProfileIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
    <circle cx="12" cy="8" r="4" />
    <path d="M4 21a8 8 0 0116 0" />
  </svg>
);

const navItems = [
  { to: '/feed', label: 'Home', icon: HomeIcon },
  { to: '/explore', label: 'Search', icon: ExploreIcon },
  { to: '/messages', label: 'Messages', icon: MessageIcon },
  { to: '/notifications', label: 'Notifications', icon: HeartIcon },
];

export const AppShell: React.FC<AppShellProps> = ({
  title,
  description,
  action,
  aside,
  children,
}) => {
  const { user, logout } = useAuth();
  const profilePath = user ? '/profile' : '/feed';

  return (
    <div className="min-h-screen bg-neutral-50 text-neutral-900">
      <div className="lg:flex">
        <aside className="hidden lg:fixed lg:inset-y-0 lg:flex lg:w-60 lg:flex-col lg:border-r lg:border-neutral-200 lg:bg-white">
          <div className="px-6 py-6">
            <Link to="/feed" className="text-xl font-semibold tracking-tight">
              DATN Social
            </Link>
          </div>

          <nav className="flex-1 space-y-1 px-3">
            {navItems.map((item) => {
              const Icon = item.icon;
              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  className={({ isActive }) =>
                    joinClasses(
                      'flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium transition',
                      isActive
                        ? 'bg-neutral-100 text-neutral-900'
                        : 'text-neutral-600 hover:bg-neutral-50 hover:text-neutral-900',
                    )
                  }
                >
                  <Icon className="h-5 w-5" />
                  <span>{item.label}</span>
                </NavLink>
              );
            })}

            <NavLink
              to={profilePath}
              className={({ isActive }) =>
                joinClasses(
                  'flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium transition',
                  isActive
                    ? 'bg-neutral-100 text-neutral-900'
                    : 'text-neutral-600 hover:bg-neutral-50 hover:text-neutral-900',
                )
              }
            >
              <ProfileIcon className="h-5 w-5" />
              <span>Profile</span>
            </NavLink>
          </nav>

          <div className="mt-auto space-y-3 px-4 pb-6">
            <Link
              to={profilePath}
              className="flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium text-neutral-700 transition hover:bg-neutral-50"
            >
              <Avatar src={user?.avatarUrl} name={user?.name} username={user?.username} size="sm" />
              <span className="truncate">{user?.username || user?.name || 'Profile'}</span>
            </Link>
            <button
              onClick={logout}
              className="w-full rounded-xl border border-neutral-200 px-3 py-2 text-sm font-medium text-neutral-600 transition hover:border-neutral-300 hover:text-neutral-900"
            >
              Log out
            </button>
          </div>
        </aside>

        <div className="flex min-h-screen flex-1 flex-col lg:ml-60">
          <header className="sticky top-0 z-20 border-b border-neutral-200 bg-white/90 px-4 py-3 backdrop-blur lg:hidden">
            <div className="flex items-center justify-between">
              <Link to="/feed" className="text-lg font-semibold">
                DATN Social
              </Link>
              <div className="flex items-center gap-3">
                <NotificationBell />
                <Link to={profilePath} aria-label="Profile">
                  <Avatar src={user?.avatarUrl} name={user?.name} username={user?.username} size="sm" />
                </Link>
              </div>
            </div>
          </header>

          <main className="mx-auto w-full max-w-[935px] px-4 pb-24 pt-6 lg:px-8 lg:pt-8">
            <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h1 className="text-lg font-semibold text-neutral-900">{title}</h1>
                {description ? (
                  <p className="mt-1 text-sm text-neutral-500">{description}</p>
                ) : null}
              </div>
              <div className="flex items-center gap-3">
                {action}
                <div className="hidden sm:block">
                  <NotificationBell />
                </div>
              </div>
            </div>

            {aside ? (
              <div className="grid gap-8 xl:grid-cols-[minmax(0,1fr),320px]">
                <div className="space-y-6">{children}</div>
                <aside className="hidden xl:block">{aside}</aside>
              </div>
            ) : (
              <div className="space-y-6">{children}</div>
            )}
          </main>

          <nav className="fixed bottom-0 left-0 right-0 z-30 border-t border-neutral-200 bg-white lg:hidden">
            <div className="mx-auto flex max-w-[935px] items-center justify-around px-4 py-2">
              <NavLink to="/feed" className="p-2 text-neutral-600">
                <HomeIcon className="h-6 w-6" />
              </NavLink>
              <NavLink to="/explore" className="p-2 text-neutral-600">
                <ExploreIcon className="h-6 w-6" />
              </NavLink>
              <NavLink to="/messages" className="p-2 text-neutral-600">
                <MessageIcon className="h-6 w-6" />
              </NavLink>
              <NavLink to="/notifications" className="p-2 text-neutral-600">
                <HeartIcon className="h-6 w-6" />
              </NavLink>
              <NavLink to={profilePath} className="p-2 text-neutral-600" aria-label="Profile">
                <ProfileIcon className="h-6 w-6" />
              </NavLink>
            </div>
          </nav>
        </div>
      </div>
    </div>
  );
};

