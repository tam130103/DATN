import React, { useEffect, useState } from 'react';
import { Link, NavLink, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { chatService } from '../../services/chat.service';
import { chatSocketService } from '../../services/chat-socket.service';
import { notificationService } from '../../services/notification.service';
import { Avatar } from '../common/Avatar';
import { BrandLogo } from '../branding/BrandLogo';

interface AppShellProps {
  title?: string;
  description?: string;
  action?: React.ReactNode;
  aside?: React.ReactNode;
  children: React.ReactNode;
  fullWidth?: boolean;
}

const HomeIcon = ({ filled }: { filled?: boolean }) =>
  filled ? (
    <svg viewBox="0 0 24 24" className="h-6 w-6" fill="currentColor">
      <path d="M22 23h-6.001a1 1 0 01-1-1v-5.455a2.997 2.997 0 10-5.993 0V22a1 1 0 01-1 1H2a1 1 0 01-1-1V11.543a1.002 1.002 0 01.31-.724l10-9.543a1.001 1.001 0 011.38 0l10 9.543a1.002 1.002 0 01.31.724V22a1 1 0 01-1 1z" />
    </svg>
  ) : (
    <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="1.9">
      <path d="M9.005 16.545a2.997 2.997 0 012.997-2.997A2.997 2.997 0 0115 16.545V22h7V11.543L12 2 2 11.543V22h7.005v-5.455z" strokeLinejoin="round" />
    </svg>
  );

const SearchIcon = ({ filled }: { filled?: boolean }) =>
  filled ? (
    <svg viewBox="0 0 24 24" className="h-6 w-6" fill="currentColor">
      <path d="M10.5 18.5a8 8 0 118-8 8 8 0 01-8 8zm0-14a6 6 0 100 12 6 6 0 000-12z" />
      <path d="M22 22l-4.35-4.35" />
    </svg>
  ) : (
    <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="1.9">
      <circle cx="11" cy="11" r="8" />
      <line x1="21" y1="21" x2="16.65" y2="16.65" />
    </svg>
  );

const MessengerIcon = ({ filled }: { filled?: boolean }) =>
  filled ? (
    <svg viewBox="0 0 24 24" className="h-6 w-6" fill="currentColor">
      <path d="M22 2L15 22l-4-9-9-4 20-7z" />
      <path d="M22 2L11 13" stroke="currentColor" strokeWidth="2" fill="none" />
    </svg>
  ) : (
    <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="1.9">
      <path d="M22 2L11 13" />
      <path d="M22 2L15 22l-4-9-9-4 20-7z" />
    </svg>
  );

const HeartIcon = ({ filled }: { filled?: boolean }) =>
  filled ? (
    <svg viewBox="0 0 24 24" className="h-6 w-6" fill="currentColor">
      <path d="M16.792 3.904A4.989 4.989 0 0121.5 9.122c0 3.072-2.652 4.959-5.197 7.222-2.512 2.243-3.865 3.469-4.303 3.752-.477-.309-1.834-1.527-4.303-3.752C5.152 14.08 2.5 12.194 2.5 9.122a4.989 4.989 0 014.708-5.218 4.21 4.21 0 013.675 1.941c.84 1.175.98 1.763 1.12 1.763s.278-.588 1.11-1.766a4.17 4.17 0 013.679-1.938z" />
    </svg>
  ) : (
    <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="1.9">
      <path d="M16.792 3.904A4.989 4.989 0 0121.5 9.122c0 3.072-2.652 4.959-5.197 7.222-2.512 2.243-3.865 3.469-4.303 3.752-.477-.309-1.834-1.527-4.303-3.752C5.152 14.08 2.5 12.194 2.5 9.122a4.989 4.989 0 014.708-5.218 4.21 4.21 0 013.675 1.941c.84 1.175.98 1.763 1.12 1.763s.278-.588 1.11-1.766a4.17 4.17 0 013.679-1.938z" />
    </svg>
  );

const MenuIcon = () => (
  <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="1.9">
    <line x1="3" y1="6" x2="21" y2="6" />
    <line x1="3" y1="12" x2="21" y2="12" />
    <line x1="3" y1="18" x2="21" y2="18" />
  </svg>
);

const ShieldIcon = ({ filled }: { filled?: boolean }) =>
  filled ? (
    <svg viewBox="0 0 24 24" className="h-6 w-6" fill="currentColor">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
    </svg>
  ) : (
    <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
    </svg>
  );

const navItems = [
  { to: '/feed', label: 'Trang chủ', icon: HomeIcon },
  { to: '/explore', label: 'Khám phá', icon: SearchIcon },
  { to: '/messages', label: 'Tin nhắn', icon: MessengerIcon },
  { to: '/notifications', label: 'Thông báo', icon: HeartIcon },
];

const getPageLabel = (pathname: string) => {
  if (pathname.startsWith('/explore')) return 'Khám phá';
  if (pathname.startsWith('/messages')) return 'Tin nhắn';
  if (pathname.startsWith('/notifications')) return 'Thông báo';
  if (pathname.startsWith('/profile')) return 'Hồ sơ';
  return 'Trang chủ';
};

const notificationBadge = (count: number) =>
  count > 0 ? (
    <span className="absolute -right-2 -top-1.5 flex min-h-[18px] min-w-[18px] items-center justify-center rounded-full bg-[var(--app-accent)] px-1 text-[10px] font-bold text-white">
      {count > 9 ? '9+' : count}
    </span>
  ) : null;

const desktopNavItemClass = (isActive: boolean) =>
  `group flex items-center gap-4 rounded-lg px-3 py-3 text-base transition ${
    isActive
      ? 'font-semibold text-[var(--app-text)]'
      : 'font-normal text-[var(--app-text)] hover:bg-[var(--app-bg-soft)]'
  }`;

const compactNavItemClass = (isActive: boolean) =>
  `group flex h-12 w-12 items-center justify-center rounded-lg transition ${
    isActive ? 'text-[var(--app-text)]' : 'text-[var(--app-text)] hover:bg-[var(--app-bg-soft)]'
  }`;

export const AppShell: React.FC<AppShellProps> = ({
  title,
  description,
  action,
  aside,
  children,
  fullWidth,
}) => {
  const { user, isAdmin, logout } = useAuth();
  const location = useLocation();
  const isMessagesPage = location.pathname.startsWith('/messages');
  const showHeader = !fullWidth && !isMessagesPage && (title || description || action);
  const profilePath = '/profile';
  const pageLabel = getPageLabel(location.pathname);
  const isProfileRoute =
    location.pathname === profilePath ||
    (!!user?.username && location.pathname === `/${user.username}`) ||
    (!!user?.id && location.pathname === `/${user.id}`);

  const [unreadMessages, setUnreadMessages] = useState(0);
  const [unreadNotifications, setUnreadNotifications] = useState(0);

  useEffect(() => {
    if (!user) return;

    chatService.getUnreadCount?.().then(setUnreadMessages).catch(() => {});
    notificationService.getUnreadCount?.().then(setUnreadNotifications).catch(() => {});

    const unsubscribeMessages = chatSocketService.on('unreadCount', setUnreadMessages);
    const unsubscribeNotifications = notificationService.on('unreadCount', setUnreadNotifications);

    return () => {
      unsubscribeMessages();
      unsubscribeNotifications();
    };
  }, [user]);

  useEffect(() => {
    if (!user) return;

    if (location.pathname.startsWith('/messages')) {
      setUnreadMessages(0);
    }

    if (location.pathname.startsWith('/notifications')) {
      setUnreadNotifications(0);
      notificationService.markAllAsRead();
      notificationService.markAllAsReadHttp().catch(() => {});
    }
  }, [location.pathname, user]);

  return (
    <div className="app-shell">
      <aside className="fixed inset-y-0 left-0 z-30 hidden border-r border-[var(--app-border)] bg-white lg:flex lg:w-[72px] xl:w-[244px]">
        <div className="flex h-full w-full flex-col px-2 py-4 xl:px-3">
          <Link to="/feed" className="flex h-[92px] items-center px-2 xl:px-3">
            <BrandLogo
              variant="full"
              className="hidden h-auto w-[112px] object-contain xl:block"
            />
            <BrandLogo
              variant="mark"
              className="h-8 w-8 rounded-lg object-contain xl:hidden"
            />
          </Link>

          <nav className="flex flex-1 flex-col gap-1">
            {navItems.map((item) => {
              const isActive = location.pathname.startsWith(item.to);
              const Icon = item.icon;
              const badge =
                item.to === '/messages'
                  ? unreadMessages
                  : item.to === '/notifications'
                    ? unreadNotifications
                    : 0;

              return (
                <NavLink key={item.to} to={item.to} className="xl:block">
                  <span className="hidden xl:block">
                    <span className={desktopNavItemClass(isActive)}>
                      <span className="relative">
                        <Icon filled={isActive} />
                        {notificationBadge(badge)}
                      </span>
                      <span>{item.label}</span>
                    </span>
                  </span>

                  <span className="block xl:hidden">
                    <span className={compactNavItemClass(isActive)}>
                      <span className="relative">
                        <Icon filled={isActive} />
                        {notificationBadge(badge)}
                      </span>
                    </span>
                  </span>
                </NavLink>
              );
            })}

            {isAdmin && (
              <NavLink to="/admin" className="xl:block">
                <span className="hidden xl:block">
                  <span className={desktopNavItemClass(location.pathname.startsWith('/admin'))}>
                    <span className="relative">
                      <ShieldIcon filled={location.pathname.startsWith('/admin')} />
                    </span>
                    <span className="text-[#6366f1] font-semibold">Quản trị</span>
                  </span>
                </span>
                <span className="block xl:hidden">
                  <span className={compactNavItemClass(location.pathname.startsWith('/admin'))}>
                    <span className="relative text-[#6366f1]">
                      <ShieldIcon filled={location.pathname.startsWith('/admin')} />
                    </span>
                  </span>
                </span>
              </NavLink>
            )}

            <NavLink to={profilePath}>
              <span className="hidden xl:block">
                <span className={desktopNavItemClass(isProfileRoute)}>
                  <Avatar
                    src={user?.avatarUrl}
                    name={user?.name}
                    username={user?.username}
                    size="sm"
                    ring={isProfileRoute}
                  />
                  <span>Hồ sơ</span>
                </span>
              </span>

              <span className="block xl:hidden">
                <span className={compactNavItemClass(isProfileRoute)}>
                  <Avatar
                    src={user?.avatarUrl}
                    name={user?.name}
                    username={user?.username}
                    size="sm"
                    ring={isProfileRoute}
                  />
                </span>
              </span>
            </NavLink>
          </nav>

          <div className="mt-auto border-t border-[var(--app-border)] pt-4">
            {user ? (
              <div className="hidden items-center gap-3 px-3 pb-4 xl:flex">
                <Avatar
                  src={user.avatarUrl}
                  name={user.name}
                  username={user.username}
                  size="md"
                />
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-[var(--app-text)]">
                    {user.username || user.name || 'Hồ sơ'}
                  </p>
                  <p className="truncate text-sm text-[var(--app-muted)]">
                    {user.name || 'DATN Social'}
                  </p>
                </div>
              </div>
            ) : null}

            <button
              type="button"
              onClick={logout}
              className="flex w-full items-center gap-4 rounded-lg px-3 py-3 text-left text-base text-[var(--app-text)] transition hover:bg-[var(--app-bg-soft)]"
            >
              <MenuIcon />
              <span className="hidden xl:inline">Đăng xuất</span>
            </button>
          </div>
        </div>
      </aside>

      <header className="app-header sticky top-0 z-20 border-b border-[var(--app-border)] bg-white/95 backdrop-blur lg:hidden">
        <div className="mx-auto flex max-w-[935px] items-center justify-between px-4 py-3">
          <div className="min-w-0">
            <Link to="/feed" className="inline-flex items-center">
              <BrandLogo variant="full" className="h-auto w-[112px] object-contain" />
            </Link>
            <p className="mt-1 text-xs font-medium text-[var(--app-muted)]">{pageLabel}</p>
          </div>

          <div className="flex items-center gap-3">
            {unreadMessages > 0 ? (
              <Link to="/messages" className="text-xs font-semibold text-[var(--app-primary)]">
                {unreadMessages} tin nhắn mới
              </Link>
            ) : null}
            {unreadNotifications > 0 ? (
              <Link
                to="/notifications"
                className="text-xs font-semibold text-[var(--app-primary)]"
              >
                {unreadNotifications} thông báo
              </Link>
            ) : null}
            <Link to={profilePath}>
              <Avatar
                src={user?.avatarUrl}
                name={user?.name}
                username={user?.username}
                size="sm"
                ring={isProfileRoute}
              />
            </Link>
          </div>
        </div>
      </header>

      <div className="min-h-screen lg:ml-[72px] xl:ml-[244px]">
        <main
          className={`app-main mx-auto w-full ${
            isMessagesPage || fullWidth
              ? 'app-main--full max-w-full px-0 pt-0'
              : 'max-w-[975px] px-4 pt-4 sm:px-6 lg:px-8 lg:pt-8'
          }`}
        >
          {showHeader ? (
            <div className="mb-6 flex flex-col gap-4 border-b border-[var(--app-border)] pb-4 sm:flex-row sm:items-end sm:justify-between">
              <div className="max-w-2xl">
                {title ? (
                  <h1 className="text-[28px] font-semibold leading-tight text-[var(--app-text)]">
                    {title}
                  </h1>
                ) : null}
                {description ? (
                  <p className="mt-2 text-sm leading-6 text-[var(--app-muted-strong)]">
                    {description}
                  </p>
                ) : null}
              </div>
              {action ? <div className="sm:ml-auto">{action}</div> : null}
            </div>
          ) : null}

          {aside ? (
            <div className="grid gap-8 xl:grid-cols-[minmax(0,1fr)_320px]">
              <div className={`w-full ${fullWidth ? '' : 'mx-auto max-w-[630px]'}`}>{children}</div>
              <aside className="hidden xl:block">{aside}</aside>
            </div>
          ) : (
            <div className={fullWidth ? '' : 'mx-auto w-full max-w-[935px]'}>{children}</div>
          )}
        </main>
      </div>

      <nav className="app-bottom-nav fixed inset-x-0 bottom-0 z-30 border-t border-[var(--app-border)] bg-white lg:hidden">
        <div className="mx-auto flex h-full max-w-md items-center justify-around px-2">
          {navItems.map((item) => {
            const isActive = location.pathname.startsWith(item.to);
            const Icon = item.icon;
            const badge =
              item.to === '/messages'
                ? unreadMessages
                : item.to === '/notifications'
                  ? unreadNotifications
                  : 0;

            return (
              <NavLink
                key={item.to}
                to={item.to}
                className="relative flex h-14 w-14 items-center justify-center"
              >
                <span className={`relative transition ${isActive ? 'scale-110' : ''}`}>
                  <Icon filled={isActive} />
                  {notificationBadge(badge)}
                </span>
              </NavLink>
            );
          })}

          {isAdmin && (
            <NavLink
              to="/admin"
              className="relative flex h-14 w-14 items-center justify-center text-[#6366f1]"
            >
              <span className={`relative transition ${location.pathname.startsWith('/admin') ? 'scale-110' : ''}`}>
                <ShieldIcon filled={location.pathname.startsWith('/admin')} />
              </span>
            </NavLink>
          )}

          <NavLink to={profilePath} className="flex h-14 w-14 items-center justify-center">
            <Avatar
              src={user?.avatarUrl}
              name={user?.name}
              username={user?.username}
              size="sm"
              ring={isProfileRoute}
            />
          </NavLink>
        </div>
      </nav>
    </div>
  );
};
