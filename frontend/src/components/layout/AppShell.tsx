import React, { useEffect, useState } from 'react';
import { Link, NavLink, useLocation } from 'react-router-dom';
import { motion, useReducedMotion } from 'framer-motion';
import {
  Heart,
  House,
  MagnifyingGlass,
  PaperPlaneTilt,
  ShieldCheck,
  SignOut,
} from '@phosphor-icons/react';
import type { Icon } from '@phosphor-icons/react';
import { useAuth } from '../../contexts/AuthContext';
import { chatService } from '../../services/chat.service';
import { chatSocketService } from '../../services/chat-socket.service';
import { notificationService } from '../../services/notification.service';
import { Avatar } from '../common/Avatar';
import { BrandLogo } from '../branding/BrandLogo';
import { ThemeToggle } from '../common/ThemeToggle';

interface AppShellProps {
  title?: string;
  description?: string;
  action?: React.ReactNode;
  aside?: React.ReactNode;
  children: React.ReactNode;
  fullWidth?: boolean;
}

type NavIcon = Icon;

const navItems: Array<{ to: string; label: string; icon: NavIcon }> = [
  { to: '/feed', label: 'Trang chủ', icon: House },
  { to: '/explore', label: 'Khám phá', icon: MagnifyingGlass },
  { to: '/messages', label: 'Tin nhắn', icon: PaperPlaneTilt },
  { to: '/notifications', label: 'Thông báo', icon: Heart },
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
  `spring-ease group relative flex items-center gap-4 rounded-lg px-3 py-3 text-base ${
    isActive
      ? 'font-semibold text-[var(--app-text)] before:absolute before:-left-2 before:top-1/2 before:hidden before:h-5 before:w-[3px] before:-translate-y-1/2 before:rounded-full before:bg-[var(--app-primary)] xl:before:block'
      : 'font-normal text-[var(--app-text)] hover:bg-[var(--app-bg-soft)]'
  }`;

const compactNavItemClass = (isActive: boolean) =>
  `spring-ease group flex h-12 w-12 items-center justify-center rounded-lg ${
    isActive ? 'text-[var(--app-primary)]' : 'text-[var(--app-text)] hover:bg-[var(--app-bg-soft)]'
  }`;

export const AppShell: React.FC<AppShellProps> = ({
  title,
  description,
  action,
  aside,
  children,
  fullWidth,
}) => {
  const { user, isAdmin, logout, token } = useAuth();
  const prefersReducedMotion = useReducedMotion();
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
    if (!user || !token) return undefined;

    notificationService.connect(token);
    chatSocketService.connect(token);

    chatService.getUnreadCount?.().then(setUnreadMessages).catch(() => {});
    notificationService.getUnreadCount?.().then(setUnreadNotifications).catch(() => {});

    const unsubscribeMessages = chatSocketService.on('unreadCount', setUnreadMessages);
    const unsubscribeNotifications = notificationService.on('unreadCount', setUnreadNotifications);
    const unsubscribeNewNotification = notificationService.on('notification', () => {
      setUnreadNotifications((prev) => prev + 1);
    });
    const unsubscribeNewMessage = chatSocketService.on('newMessage', (message: { senderId?: string }) => {
      if (message.senderId !== user.id) {
        chatService.getUnreadCount?.().then(setUnreadMessages).catch(() => {});
      }
    });

    return () => {
      unsubscribeMessages();
      unsubscribeNotifications();
      unsubscribeNewNotification();
      unsubscribeNewMessage();
    };
  }, [user, token]);

  useEffect(() => {
    if (!user) return;

    if (location.pathname.startsWith('/messages')) {
      setUnreadMessages(0);
    }

    if (location.pathname.startsWith('/notifications')) {
      setUnreadNotifications(0);
    }
  }, [location.pathname, user]);

  return (
    <div className="app-shell">
      <a
        href="#main-content"
        className="sr-only z-[1001] rounded-md bg-[var(--app-primary)] px-4 py-2 text-sm font-semibold text-white focus:not-sr-only focus:fixed focus:left-4 focus:top-4"
      >
        Chuyển tới nội dung chính
      </a>

      <aside className="glass-panel fixed inset-y-0 left-0 z-30 hidden border-r lg:flex lg:w-[72px] xl:w-[244px]">
        <div className="flex h-full w-full flex-col px-2 py-4 xl:px-3">
          <Link to="/feed" className="flex h-[92px] items-center px-2 xl:px-3">
            <BrandLogo variant="full" className="hidden h-auto w-[112px] object-contain xl:block" />
            <BrandLogo variant="mark" className="h-8 w-8 rounded-lg object-contain xl:hidden" />
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
                      <motion.span
                        className="relative"
                        animate={
                          isActive && !prefersReducedMotion
                            ? { scale: [1, 1.08, 1] }
                            : {}
                        }
                        transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
                      >
                        <Icon size={24} weight={isActive ? 'fill' : 'regular'} aria-hidden="true" />
                        {notificationBadge(badge)}
                      </motion.span>
                      <span>{item.label}</span>
                    </span>
                  </span>

                  <span className="block xl:hidden">
                    <span className={compactNavItemClass(isActive)}>
                      <span className="relative">
                        <Icon size={24} weight={isActive ? 'fill' : 'regular'} aria-hidden="true" />
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
                    <span className="relative text-[var(--app-primary)]">
                      <ShieldCheck size={24} weight={location.pathname.startsWith('/admin') ? 'fill' : 'regular'} aria-hidden="true" />
                    </span>
                    <span className="font-semibold text-[var(--app-primary)]">Quản trị</span>
                  </span>
                </span>
                <span className="block xl:hidden">
                  <span className={compactNavItemClass(location.pathname.startsWith('/admin'))}>
                    <span className="relative text-[var(--app-primary)]">
                      <ShieldCheck size={24} weight={location.pathname.startsWith('/admin') ? 'fill' : 'regular'} aria-hidden="true" />
                    </span>
                  </span>
                </span>
              </NavLink>
            )}

            <NavLink to={profilePath}>
              <span className="hidden xl:block">
                <span className={desktopNavItemClass(isProfileRoute)}>
                  <span className="relative">
                    <Avatar src={user?.avatarUrl} name={user?.name} username={user?.username} size="sm" ring={isProfileRoute} />
                    <span className="status-dot-online absolute -bottom-0.5 -right-0.5 border-2 border-[var(--app-surface)]" />
                  </span>
                  <span>Hồ sơ</span>
                </span>
              </span>

              <span className="block xl:hidden">
                <span className={compactNavItemClass(isProfileRoute)}>
                  <span className="relative">
                    <Avatar src={user?.avatarUrl} name={user?.name} username={user?.username} size="sm" ring={isProfileRoute} />
                    <span className="status-dot-online absolute -bottom-0.5 -right-0.5 border-2 border-[var(--app-surface)]" />
                  </span>
                </span>
              </span>
            </NavLink>
          </nav>

          <div className="mt-auto border-t border-[var(--app-border)] pt-4">
            {user ? (
              <div className="hidden items-center gap-3 px-3 pb-4 xl:flex">
                <span className="relative">
                  <Avatar src={user.avatarUrl} name={user.name} username={user.username} size="md" />
                  <span className="status-dot-online absolute -bottom-0.5 -right-0.5 border-2 border-[var(--app-surface)]" />
                </span>
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-[var(--app-text)]">
                    {user.username || user.name || 'Hồ sơ'}
                  </p>
                  <p className="truncate text-sm text-[var(--app-muted)]">{user.name || 'DATN Social'}</p>
                </div>
              </div>
            ) : null}

            <div className="flex items-center justify-between px-3 pb-2">
              <span className="hidden text-sm font-medium text-[var(--app-text)] xl:inline">Giao diện</span>
              <ThemeToggle />
            </div>

            <button
              type="button"
              onClick={logout}
              className="spring-ease flex w-full items-center gap-4 rounded-lg px-3 py-3 text-left text-base text-[var(--app-text)] hover:bg-[var(--app-bg-soft)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--app-primary)]"
            >
              <SignOut size={24} aria-hidden="true" />
              <span className="hidden xl:inline">Đăng xuất</span>
            </button>
          </div>
        </div>
      </aside>

      <header className="glass-panel app-header sticky top-0 z-20 border-b lg:hidden">
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
              <Link to="/notifications" className="text-xs font-semibold text-[var(--app-primary)]">
                {unreadNotifications} thông báo
              </Link>
            ) : null}
            <ThemeToggle />
            <Link to={profilePath}>
              <Avatar src={user?.avatarUrl} name={user?.name} username={user?.username} size="sm" ring={isProfileRoute} />
            </Link>
          </div>
        </div>
      </header>

      <div className="min-h-[100dvh] lg:ml-[72px] xl:ml-[244px]">
        <main
          id="main-content"
          className={`app-main mx-auto w-full ${
            isMessagesPage || fullWidth
              ? 'app-main--full max-w-full px-0 pt-0'
              : 'max-w-[975px] px-4 pt-4 sm:px-6 lg:px-8 lg:pt-8'
          }`}
        >
          {showHeader ? (
            <div className="mb-6 flex flex-col gap-4 border-b border-[var(--app-border)] pb-4 sm:flex-row sm:items-end sm:justify-between">
              <div className="max-w-2xl">
                {title ? <h1 className="text-[28px] font-semibold leading-tight text-[var(--app-text)]">{title}</h1> : null}
                {description ? <p className="mt-2 text-sm leading-6 text-[var(--app-muted-strong)]">{description}</p> : null}
              </div>
              {action ? <div className="sm:ml-auto">{action}</div> : null}
            </div>
          ) : null}

          {aside ? (
            <div className="grid gap-8 xl:grid-cols-[minmax(0,1fr)_320px]">
              <motion.div
                initial={prefersReducedMotion ? {} : { opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
                className={`w-full ${fullWidth ? '' : 'mx-auto max-w-[630px]'}`}
              >
                {children}
              </motion.div>
              <aside className="hidden xl:block">{aside}</aside>
            </div>
          ) : (
            <motion.div
              initial={prefersReducedMotion ? {} : { opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
              className={fullWidth ? '' : 'mx-auto w-full max-w-[935px]'}
            >
              {children}
            </motion.div>
          )}
        </main>
      </div>

      <nav className="glass-panel app-bottom-nav fixed inset-x-0 bottom-0 z-30 border-t lg:hidden">
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
              <NavLink key={item.to} to={item.to} className="relative flex h-14 w-14 items-center justify-center" aria-label={item.label}>
                <motion.span
                  className={`relative ${isActive ? 'text-[var(--app-primary)]' : 'text-[var(--app-text)]'}`}
                  whileTap={{ scale: 0.88 }}
                  animate={{ scale: isActive ? 1.12 : 1 }}
                  transition={{ type: 'spring', stiffness: 360, damping: 22 }}
                >
                  <Icon size={24} weight={isActive ? 'fill' : 'regular'} aria-hidden="true" />
                  {notificationBadge(badge)}
                </motion.span>
              </NavLink>
            );
          })}

          {isAdmin && (
            <NavLink to="/admin" className="relative flex h-14 w-14 items-center justify-center text-[var(--app-primary)]" aria-label="Quản trị">
              <motion.span
                className="relative"
                whileTap={{ scale: 0.88 }}
                animate={{ scale: location.pathname.startsWith('/admin') ? 1.12 : 1 }}
                transition={{ type: 'spring', stiffness: 360, damping: 22 }}
              >
                <ShieldCheck size={24} weight={location.pathname.startsWith('/admin') ? 'fill' : 'regular'} aria-hidden="true" />
              </motion.span>
            </NavLink>
          )}

          <NavLink to={profilePath} className="flex h-14 w-14 items-center justify-center" aria-label="Hồ sơ">
            <Avatar src={user?.avatarUrl} name={user?.name} username={user?.username} size="sm" ring={isProfileRoute} />
          </NavLink>
        </div>
      </nav>
    </div>
  );
};
