import React, { useState, useEffect } from 'react';
import { NavLink, Link, useLocation } from 'react-router-dom';
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

/* ── Instagram SVG Icons ── */

const HomeIcon = ({ filled }: { filled?: boolean }) =>
  filled ? (
    <svg viewBox="0 0 24 24" className="h-6 w-6" fill="currentColor">
      <path d="M22 23h-6.001a1 1 0 01-1-1v-5.455a2.997 2.997 0 10-5.993 0V22a1 1 0 01-1 1H2a1 1 0 01-1-1V11.543a1.002 1.002 0 01.31-.724l10-9.543a1.001 1.001 0 011.38 0l10 9.543a1.002 1.002 0 01.31.724V22a1 1 0 01-1 1z" />
    </svg>
  ) : (
    <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M9.005 16.545a2.997 2.997 0 012.997-2.997A2.997 2.997 0 0115 16.545V22h7V11.543L12 2 2 11.543V22h7.005v-5.455z" strokeLinejoin="round" />
    </svg>
  );

const SearchIcon = ({ filled }: { filled?: boolean }) =>
  filled ? (
    <svg viewBox="0 0 24 24" className="h-6 w-6" fill="currentColor">
      <path d="M18.5 10.5a8 8 0 10-8 8 8 8 0 008-8zm-8 10a10 10 0 1110-10 10 10 0 01-10 10z" />
      <path d="M22.707 21.293l-4.825-4.825a.999.999 0 10-1.414 1.414l4.825 4.825a.999.999 0 101.414-1.414z" />
    </svg>
  ) : (
    <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="2">
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
    <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="2">
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
    <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M16.792 3.904A4.989 4.989 0 0121.5 9.122c0 3.072-2.652 4.959-5.197 7.222-2.512 2.243-3.865 3.469-4.303 3.752-.477-.309-1.834-1.527-4.303-3.752C5.152 14.08 2.5 12.194 2.5 9.122a4.989 4.989 0 014.708-5.218 4.21 4.21 0 013.675 1.941c.84 1.175.98 1.763 1.12 1.763s.278-.588 1.11-1.766a4.17 4.17 0 013.679-1.938z" />
    </svg>
  );



const MenuIcon = () => (
  <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="2">
    <line x1="3" y1="6" x2="21" y2="6" />
    <line x1="3" y1="12" x2="21" y2="12" />
    <line x1="3" y1="18" x2="21" y2="18" />
  </svg>
);

const navItems = [
  { to: '/feed', label: 'Home', icon: HomeIcon },
  { to: '/explore', label: 'Search', icon: SearchIcon },
  { to: '/messages', label: 'Messages', icon: MessengerIcon },
  { to: '/notifications', label: 'Notifications', icon: HeartIcon },
];

const desktopNavItemClass = (isActive: boolean) =>
  `group flex items-center gap-4 rounded-2xl px-3 py-3 text-[#262626] transition-[background-color,transform] duration-200 ease-out hover:bg-[#f4f4f5] hover:scale-[1.01] active:scale-[0.99] motion-reduce:transition-none motion-reduce:hover:scale-100 ${
    isActive ? 'font-bold' : 'font-normal'
  }`;

const desktopIconWrapClass =
  'relative transition-transform duration-200 ease-out group-hover:scale-110 motion-reduce:transition-none motion-reduce:transform-none';

const desktopLabelClass =
  'text-base tracking-[-0.01em] transition-transform duration-200 ease-out group-hover:translate-x-[1px] motion-reduce:transition-none motion-reduce:transform-none';

const compactNavItemClass =
  'group flex items-center justify-center rounded-2xl p-3 text-[#262626] transition-[background-color,transform] duration-200 ease-out hover:bg-[#f4f4f5] hover:scale-[1.03] active:scale-[0.99] motion-reduce:transition-none motion-reduce:hover:scale-100';

export const AppShell: React.FC<AppShellProps> = ({
  title,
  description,
  action,
  aside,
  children,
  fullWidth,
}) => {
  const { user, logout } = useAuth();
  const location = useLocation();
  const profilePath = '/profile';
  const isMessagesPage = location.pathname.startsWith('/messages');
  const showHeader = !fullWidth && !isMessagesPage && (title || description || action);

  const [unreadMessages, setUnreadMessages] = useState(0);
  const [unreadNotifications, setUnreadNotifications] = useState(0);

  useEffect(() => {
    if (!user) return;

    chatService.getUnreadCount?.().then(setUnreadMessages).catch(() => {});
    notificationService.getUnreadCount?.().then(setUnreadNotifications).catch(() => {});

    const unsubMessages = chatSocketService.on('unreadCount', setUnreadMessages);
    const unsubNotifs = notificationService.on('unreadCount', setUnreadNotifications);

    return () => {
      unsubMessages();
      unsubNotifs();
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
    <div className="app-shell min-h-screen bg-[#fafafa]">
      {/* ── Desktop Sidebar ── */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-[244px] flex-col border-r border-[#dbdbdb] bg-white xl:flex">
        {/* Logo */}
        <div className="px-6 pb-6 pt-6">
          <Link to="/feed" className="inline-flex items-center">
            <BrandLogo variant="full" className="h-auto w-[92px] object-contain" />
          </Link>
        </div>

        {/* Navigation */}
        <nav className="flex-1 space-y-0.5 px-3 pt-2">
          {navItems.map((item) => {
            const isActive = location.pathname.startsWith(item.to);
            const Icon = item.icon;
            let badge = 0;
            if (item.to === '/messages') badge = unreadMessages;
            if (item.to === '/notifications') badge = unreadNotifications;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                className={desktopNavItemClass(isActive)}
              >
                <div className={desktopIconWrapClass}>
                  <Icon filled={isActive} />
                  {badge > 0 && (
                    <div className="absolute -right-2 -top-2 flex h-5 min-w-[20px] items-center justify-center rounded-full bg-red-500 px-1 text-[11px] font-bold text-white">
                      {badge > 9 ? '9+' : badge}
                    </div>
                  )}
                </div>
                <span className={desktopLabelClass}>
                  {item.label}
                </span>
              </NavLink>
            );
          })}


          {/* Profile */}
          <NavLink
            to={profilePath}
            className={desktopNavItemClass(location.pathname === profilePath)}
          >
            <div
              className={`${desktopIconWrapClass} h-6 w-6 overflow-hidden rounded-full ${
                location.pathname === profilePath ? 'ring-2 ring-black' : ''
              }`}
            >
              <Avatar src={user?.avatarUrl} name={user?.name} username={user?.username} size="sm" />
            </div>
            <span className={desktopLabelClass}>
              Profile
            </span>
          </NavLink>
        </nav>

        {/* More/Logout */}
        <div className="px-3 pb-6">
          <button
            onClick={logout}
            className={desktopNavItemClass(false)}
          >
            <div className={desktopIconWrapClass}>
              <MenuIcon />
            </div>
            <span className={desktopLabelClass}>Log out</span>
          </button>
        </div>
      </aside>

      {/* ── Narrow Sidebar (laptop) ── */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-[72px] flex-col items-center border-r border-[#dbdbdb] bg-white lg:flex xl:hidden">
        <div className="pb-5 pt-6">
          <Link to="/feed" className="inline-flex items-center justify-center">
            <BrandLogo variant="mark" className="h-8 w-8 rounded-2xl object-contain" />
          </Link>
        </div>
        <nav className="flex-1 space-y-1 pt-2">
          {navItems.map((item) => {
            const isActive = location.pathname.startsWith(item.to);
            const Icon = item.icon;
            let badge = 0;
            if (item.to === '/messages') badge = unreadMessages;
            if (item.to === '/notifications') badge = unreadNotifications;
            return (
              <NavLink key={item.to} to={item.to} className={compactNavItemClass} title={item.label}>
                <div className={desktopIconWrapClass}>
                  <Icon filled={isActive} />
                  {badge > 0 && (
                    <div className="absolute -right-2 -top-2 flex h-5 min-w-[20px] items-center justify-center rounded-full bg-red-500 px-1 text-[11px] font-bold text-white">
                      {badge > 9 ? '9+' : badge}
                    </div>
                  )}
                </div>
              </NavLink>
            );
          })}
          <NavLink to={profilePath} className={compactNavItemClass} title="Profile">
            <div
              className={`${desktopIconWrapClass} h-6 w-6 overflow-hidden rounded-full ${
                location.pathname === profilePath ? 'ring-2 ring-black' : ''
              }`}
            >
              <Avatar src={user?.avatarUrl} name={user?.name} username={user?.username} size="sm" />
            </div>
          </NavLink>
        </nav>
        <div className="pb-6">
          <button onClick={logout} className={compactNavItemClass} title="Log out">
            <div className={desktopIconWrapClass}>
              <MenuIcon />
            </div>
          </button>
        </div>
      </aside>

      {/* ── Mobile Header ── */}
      <header className="app-header sticky top-0 z-20 flex items-center justify-between border-b border-[#dbdbdb] bg-white px-4 py-2 lg:hidden">
        <Link to="/feed" className="inline-flex items-center">
          <BrandLogo variant="full" className="h-auto w-[112px]" />
        </Link>
      </header>

      {/* ── Main Content ── */}
      <div className={`min-h-screen lg:ml-[72px] xl:ml-[244px]`}>
        <main className={`app-main mx-auto w-full ${isMessagesPage || fullWidth ? 'app-main--full max-w-full px-0 pt-0' : 'max-w-[935px] px-4 pt-4 sm:px-6 lg:pt-8'}`}>
          {showHeader ? (
            <div className="mb-4 flex flex-col gap-3 px-1 sm:flex-row sm:items-center sm:justify-between">
              <div>
                {title ? <h1 className="text-lg font-semibold text-[#262626]">{title}</h1> : null}
                {description ? <p className="mt-1 text-sm text-[#8e8e8e]">{description}</p> : null}
              </div>
              {action ? <div className="sm:ml-auto">{action}</div> : null}
            </div>
          ) : null}
          {aside ? (
            <div className="flex gap-8">
              <div className={`w-full ${fullWidth ? '' : 'max-w-[614px]'} space-y-4`}>
                {children}
              </div>
              <aside className="hidden w-[320px] flex-shrink-0 xl:block">
                {aside}
              </aside>
            </div>
          ) : (
            <div className={fullWidth ? '' : 'space-y-4'}>
              {children}
            </div>
          )}
        </main>
      </div>

      {/* ── Mobile Bottom Navigation ── */}
      <nav className="app-bottom-nav fixed bottom-0 left-0 right-0 z-30 border-t border-[#dbdbdb] bg-white lg:hidden">
        <div className="mx-auto flex items-center justify-around py-2">
          {navItems.map((item) => {
            const isActive = location.pathname.startsWith(item.to);
            const Icon = item.icon;
            let badge = 0;
            if (item.to === '/messages') badge = unreadMessages;
            if (item.to === '/notifications') badge = unreadNotifications;
            return (
              <NavLink key={item.to} to={item.to} className="p-2 text-black relative">
                <Icon filled={isActive} />
                {badge > 0 && (
                  <div className="absolute right-0 top-0 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">
                    {badge > 9 ? '9+' : badge}
                  </div>
                )}
              </NavLink>
            );
          })}
          <NavLink to={profilePath} className="p-2">
            <div className={`h-7 w-7 overflow-hidden rounded-full ${location.pathname === profilePath ? 'ring-2 ring-black' : ''}`}>
              <Avatar src={user?.avatarUrl} name={user?.name} username={user?.username} size="sm" />
            </div>
          </NavLink>
        </div>
      </nav>


    </div>
  );
};
