import React, { useState, useEffect } from 'react';
import { NavLink, Link, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { chatService } from '../../services/chat.service';
import { chatSocketService } from '../../services/chat-socket.service';
import { notificationService } from '../../services/notification.service';
import { Avatar } from '../common/Avatar';

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
      <path d="M12.003 2.001a9.705 9.705 0 110 19.41 10.99 10.99 0 01-2.981-.381l-3.27.969a.75.75 0 01-.939-.94l.97-3.269A9.706 9.706 0 0112.002 2zm0 1.5a8.205 8.205 0 105.386 14.398.75.75 0 01.607-.108l2.016-.597-.598 2.015a.75.75 0 01-.108.607A8.205 8.205 0 0012.003 3.5zM9.75 11.5a1.25 1.25 0 110 2.5 1.25 1.25 0 010-2.5zm2.25 0a1.25 1.25 0 110 2.5 1.25 1.25 0 010-2.5zm2.25 0a1.25 1.25 0 110 2.5 1.25 1.25 0 010-2.5z" />
    </svg>
  ) : (
    <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M12 3a9 9 0 00-5.78 15.88l-.6 2.02 2.02-.6A9 9 0 1012 3z" strokeLinejoin="round" />
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

  return (
    <div className="app-shell min-h-screen bg-[#fafafa]">
      {/* ── Desktop Sidebar ── */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-[244px] flex-col border-r border-[#dbdbdb] bg-white xl:flex">
        {/* Logo */}
        <div className="px-6 pb-4 pt-8">
          <Link to="/feed" className="text-2xl font-semibold tracking-tight text-black" style={{ fontFamily: "'Segoe UI', sans-serif" }}>
            DATN Social
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
                className="group flex items-center gap-4 rounded-lg px-3 py-3 transition-colors hover:bg-gray-100"
              >
                <div className="relative">
                  <Icon filled={isActive} />
                  {badge > 0 && (
                    <div className="absolute -right-2 -top-2 flex h-5 min-w-[20px] items-center justify-center rounded-full bg-red-500 px-1 text-[11px] font-bold text-white">
                      {badge > 9 ? '9+' : badge}
                    </div>
                  )}
                </div>
                <span className={`text-base ${isActive ? 'font-bold' : 'font-normal'}`}>
                  {item.label}
                </span>
              </NavLink>
            );
          })}


          {/* Profile */}
          <NavLink
            to={profilePath}
            className="group flex items-center gap-4 rounded-lg px-3 py-3 transition-colors hover:bg-gray-100"
          >
            <div className={`h-6 w-6 overflow-hidden rounded-full ${location.pathname === profilePath ? 'ring-2 ring-black' : ''}`}>
              <Avatar src={user?.avatarUrl} name={user?.name} username={user?.username} size="sm" />
            </div>
            <span className={`text-base ${location.pathname === profilePath ? 'font-bold' : 'font-normal'}`}>
              Profile
            </span>
          </NavLink>
        </nav>

        {/* More/Logout */}
        <div className="px-3 pb-6">
          <button
            onClick={logout}
            className="flex w-full items-center gap-4 rounded-lg px-3 py-3 transition-colors hover:bg-gray-100"
          >
            <MenuIcon />
            <span className="text-base font-normal">Log out</span>
          </button>
        </div>
      </aside>

      {/* ── Narrow Sidebar (laptop) ── */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-[72px] flex-col items-center border-r border-[#dbdbdb] bg-white lg:flex xl:hidden">
        <div className="pb-4 pt-8">
          <Link to="/feed" className="text-xl font-bold">D</Link>
        </div>
        <nav className="flex-1 space-y-1 pt-2">
          {navItems.map((item) => {
            const isActive = location.pathname.startsWith(item.to);
            const Icon = item.icon;
            let badge = 0;
            if (item.to === '/messages') badge = unreadMessages;
            if (item.to === '/notifications') badge = unreadNotifications;
            return (
              <NavLink key={item.to} to={item.to} className="flex items-center justify-center rounded-lg p-3 hover:bg-gray-100" title={item.label}>
                <div className="relative">
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
          <NavLink to={profilePath} className="flex items-center justify-center rounded-lg p-3 hover:bg-gray-100" title="Profile">
            <div className={`h-6 w-6 overflow-hidden rounded-full ${location.pathname === profilePath ? 'ring-2 ring-black' : ''}`}>
              <Avatar src={user?.avatarUrl} name={user?.name} username={user?.username} size="sm" />
            </div>
          </NavLink>
        </nav>
        <div className="pb-6">
          <button onClick={logout} className="rounded-lg p-3 hover:bg-gray-100" title="Log out">
            <MenuIcon />
          </button>
        </div>
      </aside>

      {/* ── Mobile Header ── */}
      <header className="app-header sticky top-0 z-20 flex items-center justify-between border-b border-[#dbdbdb] bg-white px-4 py-2 lg:hidden">
        <Link to="/feed" className="text-xl font-semibold tracking-tight text-black">
          DATN Social
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
