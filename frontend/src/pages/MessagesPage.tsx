import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import { useNavigate, useParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import { AppShell } from '../components/layout/AppShell';
import { Avatar } from '../components/common/Avatar';
import { useAuth } from '../contexts/AuthContext';
import { chatService, Conversation } from '../services/chat.service';
import { chatSocketService } from '../services/chat-socket.service';
import { searchService } from '../services/search.service';
import { Message, User } from '../types';

const ComposeIcon = () => <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.9"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" /><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" /></svg>;
const SendIcon = () => <svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor"><path d="M22 2L11 13" strokeWidth="2" stroke="currentColor" fill="none" /><path d="M22 2L15 22l-4-9-9-4 20-7z" /></svg>;
const HeartIcon = () => <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.9"><path d="M16.792 3.904A4.989 4.989 0 0121.5 9.122c0 3.072-2.652 4.959-5.197 7.222-2.512 2.243-3.865 3.469-4.303 3.752-.477-.309-1.834-1.527-4.303-3.752C5.152 14.08 2.5 12.194 2.5 9.122a4.989 4.989 0 014.708-5.218 4.21 4.21 0 013.675 1.941c.84 1.175.98 1.763 1.12 1.763s.278-.588 1.11-1.766a4.17 4.17 0 013.679-1.938z" /></svg>;
const SearchIcon = () => <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.9"><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></svg>;
const ArrowLeftIcon = () => <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.9"><polyline points="15 18 9 12 15 6" /></svg>;
const ChatIcon = () => <svg viewBox="0 0 24 24" className="h-10 w-10" fill="none" stroke="currentColor" strokeWidth="1.6"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" /></svg>;
const SparkleIcon = () => <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.9"><path d="M12 3l1.9 4.6L18.5 9l-4.6 1.4L12 15l-1.9-4.6L5.5 9l4.6-1.4L12 3z" /><path d="M19 15l.9 2.1L22 18l-2.1.9L19 21l-.9-2.1L16 18l2.1-.9L19 15z" /></svg>;

const relativeTime = (date?: string) => {
  if (!date) return '';
  const diff = Date.now() - new Date(date).getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return 'vừa xong';
  if (minutes < 60) return `${minutes}p`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}g`;
  return `${Math.floor(hours / 24)}n`;
};

const MessagesPage: React.FC = () => {
  const { user, token } = useAuth();
  const { conversationId } = useParams();
  const navigate = useNavigate();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<string | null>(conversationId || null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [messageInput, setMessageInput] = useState('');
  const [onlineUsers, setOnlineUsers] = useState<Set<string>>(new Set());
  const [typingUsers, setTypingUsers] = useState<Set<string>>(new Set());
  const [isLoadingConversations, setIsLoadingConversations] = useState(false);
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);
  const [showCompose, setShowCompose] = useState(false);
  const [composeMode, setComposeMode] = useState<'direct' | 'group'>('direct');
  const [composeQuery, setComposeQuery] = useState('');
  const [composeResults, setComposeResults] = useState<User[]>([]);
  const [selectedParticipants, setSelectedParticipants] = useState<User[]>([]);
  const [groupName, setGroupName] = useState('');
  const [isCreatingConversation, setIsCreatingConversation] = useState(false);
  const [isOpeningAssistant, setIsOpeningAssistant] = useState(false);
  const [messagesError, setMessagesError] = useState<{ code: number | null; message: string } | null>(null);

  const loadConversations = useCallback(async () => {
    setIsLoadingConversations(true);
    try {
      setConversations(await chatService.getConversations());
    } catch {
      toast.error('Không thể tải cuộc trò chuyện.');
    } finally {
      setIsLoadingConversations(false);
    }
  }, []);

  useEffect(() => { loadConversations(); }, [loadConversations]);
  useEffect(() => { setSelectedConversation(conversationId || null); }, [conversationId]);

  useEffect(() => {
    if (!composeQuery.trim() || composeQuery.trim().length < 2) {
      setComposeResults([]);
      return;
    }
    const timer = window.setTimeout(async () => {
      try {
        const results = await searchService.searchUsers(composeQuery.trim(), 1, 8);
        setComposeResults(results.filter((u) => u.id !== user?.id && !selectedParticipants.some((p) => p.id === u.id)));
      } catch {
        toast.error('Lỗi tìm kiếm.');
      }
    }, 250);
    return () => window.clearTimeout(timer);
  }, [composeQuery, selectedParticipants, user?.id]);

  useEffect(() => {
    if (!token) return;
    chatSocketService.connect(token);
    const unsub1 = chatSocketService.on('newMessage', (message: Message) => {
      if (message.conversationId === selectedConversation) {
        setMessages((prev) => prev.some((m) => m.id === message.id) ? prev : [...prev, message]);
      }
      loadConversations();
    });
    const unsub2 = chatSocketService.on('userTyping', (data: any) => {
      if (data.conversationId !== selectedConversation) return;
      setTypingUsers((prev) => {
        const next = new Set(prev);
        data.isTyping ? next.add(data.userId) : next.delete(data.userId);
        return next;
      });
    });
    const unsub3 = chatSocketService.on('userOnline', (data: any) => setOnlineUsers((prev) => new Set([...prev, data.userId])));
    const unsub4 = chatSocketService.on('userOffline', (data: any) => setOnlineUsers((prev) => { const next = new Set(prev); next.delete(data.userId); return next; }));
    const unsub5 = chatSocketService.on('membersOnline', (data: any) => {
      if (data.conversationId !== selectedConversation) return;
      setOnlineUsers((prev) => new Set([...prev, ...data.userIds]));
    });
    return () => { unsub1(); unsub2(); unsub3(); unsub4(); unsub5(); };
  }, [loadConversations, selectedConversation, token]);

  useEffect(() => {
    if (!selectedConversation) {
      setMessages([]);
      setMessagesError(null);
      setIsLoadingMessages(false);
      setTypingUsers(new Set());
      return;
    }
    const currentConversationId = selectedConversation;
    let cancelled = false;
    setIsLoadingMessages(true);
    setMessages([]);
    setMessagesError(null);
    setTypingUsers(new Set());
    chatService.getMessages(currentConversationId)
      .then((data) => {
        if (cancelled) return;
        setMessages(data.reverse());
        chatSocketService.joinConversation(currentConversationId);
        chatSocketService.markAsRead(currentConversationId);
        setConversations((prev) => prev.map((conv) => {
          if (conv.id !== currentConversationId || !conv.lastMessage || conv.lastMessage.senderId === user?.id) return conv;
          return { ...conv, lastMessage: { ...conv.lastMessage, isRead: true } };
        }));
      })
      .catch((err: any) => {
        if (cancelled) return;
        const status: number | null = err?.response?.status ?? err?.status ?? null;
        if (status === 403) {
          setMessagesError({ code: 403, message: 'Bạn không có quyền xem cuộc trò chuyện này.' });
        } else if (status === 404) {
          setMessagesError({ code: 404, message: 'Cuộc trò chuyện không tồn tại hoặc đã bị xoá.' });
        } else {
          setMessagesError({ code: status, message: 'Không thể tải tin nhắn. Vui lòng thử lại.' });
          toast.error('Không thể tải tin nhắn.');
        }
      })
      .finally(() => {
        if (!cancelled) {
          setIsLoadingMessages(false);
        }
      });
    return () => {
      cancelled = true;
      chatSocketService.leaveConversation(currentConversationId);
    };
  }, [selectedConversation, user?.id]);

  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages, typingUsers]);

  const selectedConv = useMemo(() => conversations.find((c) => c.id === selectedConversation), [conversations, selectedConversation]);
  const typingSummary = selectedConv?.members.filter((m) => typingUsers.has(m.id)).map((m) => m.username || m.name || 'Ai đó').join(', ');
  const unreadCount = conversations.filter((c) => !!c.lastMessage && c.lastMessage.senderId !== user?.id && !c.lastMessage.isRead).length;

  const getConversationName = (conv: Conversation) => {
    if (conv.isGroup && conv.name) return conv.name;
    if (conv.members.length === 1) return conv.members[0].username || conv.members[0].name || 'Cuộc trò chuyện';
    return conv.members.map((m) => m.username || m.name || 'Thành viên').join(', ');
  };
  const getConversationAvatar = (conv: Conversation) => conv.members[0];
  const getConversationSubtitle = (conv: Conversation) => {
    const onlineCount = conv.members.filter((m) => onlineUsers.has(m.id)).length;
    return conv.isGroup ? `${conv.members.length} thành viên${onlineCount > 0 ? ` | ${onlineCount} đang hoạt động` : ''}` : onlineCount > 0 ? 'Đang hoạt động' : 'Ngoại tuyến';
  };

  const handleSelectConversation = (id: string) => {
    setSelectedConversation(id);
    navigate(`/messages/${id}`);
    setShowCompose(false);
  };

  /** Phase 2: Open or create 1-1 conversation with AI bot */
  const handleOpenAssistantChat = async () => {
    setIsOpeningAssistant(true);
    try {
      const conv = await chatService.getAssistantConversation();
      await loadConversations();
      setSelectedConversation(conv.id);
      setShowCompose(false);
      navigate(`/messages/${conv.id}`);
    } catch {
      toast.error('Không thể mở chat AI.');
    } finally {
      setIsOpeningAssistant(false);
    }
  };

  const sendCurrentMessage = async () => {
    const content = messageInput.trim();
    if (!content || !selectedConversation) return;
    setMessageInput('');
    chatSocketService.sendTyping(selectedConversation, false);
    if (chatSocketService.isConnected()) {
      chatSocketService.sendMessage(selectedConversation, content);
      return;
    }
    try {
      const result = await chatService.sendMessage(selectedConversation, content);
      setMessages((prev) => {
        return prev.some((m) => m.id === result.message.id)
          ? prev
          : [...prev, result.message];
      });
      await loadConversations();
    } catch {
      toast.error('Lỗi gửi tin nhắn');
    }
  };

  const handleStartDirectConversation = async (participant: User) => {
    setIsCreatingConversation(true);
    try {
      const conv = await chatService.createConversation({ participantIds: [participant.id] });
      await loadConversations();
      setComposeQuery('');
      setComposeResults([]);
      setShowCompose(false);
      navigate(`/messages/${conv.id}`);
    } catch {
      toast.error('Không thể bắt đầu trò chuyện.');
    } finally {
      setIsCreatingConversation(false);
    }
  };

  const toggleParticipant = (participant: User) => {
    setSelectedParticipants((prev) => prev.some((p) => p.id === participant.id) ? prev.filter((p) => p.id !== participant.id) : [...prev, participant]);
    setComposeQuery('');
    setComposeResults([]);
  };

  const handleCreateGroup = async () => {
    if (selectedParticipants.length < 2) return toast.error('Chọn ít nhất 2 thành viên.');
    if (!groupName.trim()) return toast.error('Nhập tên nhóm.');
    setIsCreatingConversation(true);
    try {
      const conv = await chatService.createConversation({ participantIds: selectedParticipants.map((p) => p.id), isGroup: true, name: groupName.trim() });
      await loadConversations();
      setSelectedParticipants([]);
      setGroupName('');
      setShowCompose(false);
      navigate(`/messages/${conv.id}`);
    } catch {
      toast.error('Không thể tạo nhóm.');
    } finally {
      setIsCreatingConversation(false);
    }
  };

  return (
    <AppShell fullWidth>
      <div className="messages-shell bg-[var(--app-surface)]" data-testid="messages-page">
        <div className="flex h-full overflow-hidden lg:rounded-xl lg:border lg:border-[var(--app-border)]">
          <div className={`flex-shrink-0 flex-col border-r border-[var(--app-border)] bg-[var(--app-surface)] lg:w-[350px] ${selectedConversation ? 'hidden lg:flex' : 'flex w-full lg:w-[350px]'}`}>
            <div className="border-b border-[var(--app-border)] px-4 py-4">
              <div className="flex items-center justify-between gap-4">
                <div className="flex min-w-0 items-center gap-3">
                  <Avatar src={user?.avatarUrl} name={user?.name} username={user?.username} size="md" ring />
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-[var(--app-text)]">{user?.username || user?.name || 'Tin nhắn'}</p>
                    <p className="text-xs text-[var(--app-muted)]">{conversations.length} cuộc trò chuyện | {unreadCount} chưa đọc</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button type="button" onClick={() => void handleOpenAssistantChat()} disabled={isOpeningAssistant} className="inline-flex min-h-[36px] items-center justify-center gap-2 rounded-full border border-[var(--app-border)] bg-[var(--app-primary-soft)] px-3 text-xs font-semibold text-[var(--app-primary)] transition hover:opacity-80 disabled:opacity-50" title="Chat với Trợ lý AI"><SparkleIcon />{isOpeningAssistant ? 'Đang mở...' : '💬 Chat AI'}</button>
                  <button type="button" onClick={() => setShowCompose((prev) => !prev)} className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-[var(--app-border)] bg-[var(--app-surface)] text-[var(--app-text)] transition hover:bg-[var(--app-bg-soft)]"><ComposeIcon /></button>
                </div>
              </div>
            </div>

            {showCompose ? (
              <div className="border-b border-[var(--app-border)] px-4 py-4">
                <div className="space-y-3 rounded-xl bg-[var(--app-bg-soft)] p-4">
                  <div className="flex gap-2">
                    <button type="button" onClick={() => setComposeMode('direct')} className={`flex-1 rounded-md px-3 py-2 text-sm font-semibold transition ${composeMode === 'direct' ? 'bg-[var(--app-text)] text-[var(--app-surface)]' : 'border border-[var(--app-border)] bg-[var(--app-surface)] text-[var(--app-text)] hover:bg-[var(--app-bg-soft)]'}`}>Trực tiếp</button>
                    <button type="button" onClick={() => setComposeMode('group')} className={`flex-1 rounded-md px-3 py-2 text-sm font-semibold transition ${composeMode === 'group' ? 'bg-[var(--app-text)] text-[var(--app-surface)]' : 'border border-[var(--app-border)] bg-[var(--app-surface)] text-[var(--app-text)] hover:bg-[var(--app-bg-soft)]'}`}>Nhóm</button>
                  </div>
                  {composeMode === 'group' ? <input value={groupName} onChange={(e) => setGroupName(e.target.value)} placeholder="Tên nhóm" className="min-h-[42px] w-full rounded-md border border-[var(--app-border)] bg-[var(--app-surface)] px-3 text-sm text-[var(--app-text)]" /> : null}
                  {composeMode === 'group' && selectedParticipants.length > 0 ? <div className="flex flex-wrap gap-2">{selectedParticipants.map((p) => <button key={p.id} type="button" onClick={() => toggleParticipant(p)} className="rounded-full bg-[var(--app-surface)] px-3 py-1.5 text-xs font-semibold text-[var(--app-text)]">{p.username || p.name} x</button>)}</div> : null}
                  <div className="flex items-center gap-2 rounded-md border border-[var(--app-border)] bg-[var(--app-surface)] px-3 py-2.5"><SearchIcon /><input value={composeQuery} onChange={(e) => setComposeQuery(e.target.value)} placeholder="Tìm kiếm mọi người..." className="flex-1 bg-transparent text-sm text-[var(--app-text)]" /></div>
                  {composeResults.length > 0 ? <div className="space-y-1">{composeResults.map((u) => <button key={u.id} type="button" onClick={() => composeMode === 'direct' ? handleStartDirectConversation(u) : toggleParticipant(u)} className="flex w-full items-center gap-3 rounded-lg bg-[var(--app-surface)] px-3 py-2.5 text-left transition hover:bg-[var(--app-bg-soft)]"><Avatar src={u.avatarUrl} name={u.name} username={u.username} size="sm" /><div className="min-w-0"><p className="truncate text-sm font-semibold text-[var(--app-text)]">{u.username || u.name}</p>{u.name && u.username ? <p className="truncate text-xs text-[var(--app-muted)]">{u.name}</p> : null}</div></button>)}</div> : null}
                  {composeMode === 'group' && selectedParticipants.length >= 2 ? <button type="button" onClick={handleCreateGroup} disabled={isCreatingConversation} className="inline-flex min-h-[40px] w-full items-center justify-center rounded-md bg-[var(--app-primary)] px-4 text-sm font-semibold text-white transition hover:bg-[var(--app-primary-strong)] disabled:opacity-50">{isCreatingConversation ? 'Đang tạo...' : 'Tạo nhóm'}</button> : null}
                </div>
              </div>
            ) : null}

            <div className="flex-1 overflow-y-auto">
              {isLoadingConversations ? <div className="px-4 py-6 text-center text-sm text-[var(--app-muted)]">Đang tải cuộc trò chuyện...</div> : conversations.length === 0 ? (
                <div className="px-5 py-12 text-center">
                  <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full border border-[var(--app-border)] bg-[var(--app-bg-soft)] text-[var(--app-muted)]"><ChatIcon /></div>
                  <p className="text-lg font-semibold text-[var(--app-text)]">Không có cuộc trò chuyện nào</p>
                  <p className="mt-2 text-sm leading-6 text-[var(--app-muted)]">Hãy bắt đầu tạo cuộc trò chuyện ngay bây giờ.</p>
                </div>
              ) : <div className="py-2">{conversations.map((conv) => {
                const avatarMember = getConversationAvatar(conv);
                const isOnline = conv.members.some((m) => onlineUsers.has(m.id));
                const isActive = selectedConversation === conv.id;
                const hasUnread = !!conv.lastMessage && conv.lastMessage.senderId !== user?.id && !conv.lastMessage.isRead;
                return <button key={conv.id} type="button" onClick={() => handleSelectConversation(conv.id)} className={`flex w-full items-center gap-3 px-4 py-3 text-left transition ${isActive ? 'bg-[var(--app-bg-soft)]' : 'hover:bg-[var(--app-bg-soft)]'}`}><div className="relative flex-shrink-0"><Avatar src={avatarMember?.avatarUrl} name={avatarMember?.name || conv.name} username={avatarMember?.username} size="md" ring={isActive} />{isOnline ? <span className="absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-[var(--app-surface)] bg-emerald-500" /> : null}</div><div className="min-w-0 flex-1"><div className="flex items-center justify-between gap-3"><p className={`truncate text-sm ${isActive || hasUnread ? 'font-semibold' : 'font-medium'} text-[var(--app-text)]`}>{getConversationName(conv)}</p><span className="text-xs text-[var(--app-muted)]">{relativeTime(conv.updatedAt)}</span></div><p className="mt-1 truncate text-sm text-[var(--app-muted)]">{conv.lastMessage?.content || getConversationSubtitle(conv)}</p></div>{hasUnread ? <span className="h-2.5 w-2.5 rounded-full bg-[var(--app-primary)]" /> : null}</button>;
              })}</div>}
            </div>
          </div>

          {selectedConversation ? (
            <div className={`flex min-w-0 flex-1 flex-col bg-[var(--app-bg)] lg:flex`}>
              {selectedConv ? (
                <div className="border-b border-[var(--app-border)] bg-[var(--app-surface)] px-4 py-4 sm:px-5">
                  <div className="flex items-center gap-3">
                    <button type="button" onClick={() => { setSelectedConversation(null); navigate('/messages'); }} className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-[var(--app-border)] bg-[var(--app-surface)] text-[var(--app-text)] transition hover:bg-[var(--app-bg-soft)] lg:hidden"><ArrowLeftIcon /></button>
                    <div className="relative"><Avatar src={selectedConv.members[0]?.avatarUrl} name={selectedConv.members[0]?.name || selectedConv.name} username={selectedConv.members[0]?.username} size="md" ring />{selectedConv.members.some((m) => onlineUsers.has(m.id)) ? <span className="absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-[var(--app-surface)] bg-emerald-500" /> : null}</div>
                    <div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><p className="truncate text-base font-semibold text-[var(--app-text)]">{getConversationName(selectedConv)}</p>{selectedConv.isGroup ? <span className="rounded-full bg-[var(--app-bg-soft)] px-2 py-0.5 text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--app-muted)]">Nhóm</span> : null}</div><p className="mt-1 text-sm text-[var(--app-muted)]">{getConversationSubtitle(selectedConv)}</p></div>
                  </div>
                </div>
              ) : !messagesError && !isLoadingMessages ? (
                // If not in sidebar, not loading messages, and no error yet, show header with loading or generic info
                <div className="border-b border-[var(--app-border)] bg-[var(--app-surface)] px-4 py-4 sm:px-5">
                  <div className="flex items-center gap-3">
                    <button type="button" onClick={() => { setSelectedConversation(null); navigate('/messages'); }} className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-[var(--app-border)] bg-[var(--app-surface)] text-[var(--app-text)] transition hover:bg-[var(--app-bg-soft)] lg:hidden"><ArrowLeftIcon /></button>
                    <div className="h-10 w-10 animate-pulse rounded-full bg-[var(--app-bg-soft)]" />
                    <div className="flex-1 space-y-2"><div className="h-4 w-32 animate-pulse rounded bg-[var(--app-bg-soft)]" /><div className="h-3 w-20 animate-pulse rounded bg-[var(--app-bg-soft)]" /></div>
                  </div>
                </div>
              ) : null}

              <div className="flex-1 overflow-y-auto px-4 py-5 sm:px-6">
                {isLoadingMessages ? (
                  <div className="flex h-full items-center justify-center">
                    <div className="flex flex-col items-center gap-3">
                      <div className="h-8 w-8 animate-spin rounded-full border-2 border-[var(--app-primary)] border-t-transparent" />
                      <p className="text-sm text-[var(--app-muted)]">Đang tải tin nhắn...</p>
                    </div>
                  </div>
                ) : messagesError ? (
                  <div className="flex h-full flex-col items-center justify-center text-center">
                    <div className="mb-5 flex h-20 w-20 items-center justify-center rounded-full border border-[var(--app-border)] bg-amber-50 text-amber-400">
                      <svg viewBox="0 0 24 24" className="h-10 w-10" fill="none" stroke="currentColor" strokeWidth="1.6"><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" /><line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" /></svg>
                    </div>
                    <p className="text-xl font-semibold text-[var(--app-text)]">
                      {messagesError.code === 403 ? 'Không có quyền truy cập' : messagesError.code === 404 ? 'Không tìm thấy cuộc trò chuyện' : 'Có lỗi xảy ra'}
                    </p>
                    <p className="mt-2 max-w-sm text-sm leading-6 text-[var(--app-muted)]">{messagesError.message}</p>
                    <button type="button" onClick={() => { setSelectedConversation(null); navigate('/messages'); }} className="mt-6 inline-flex min-h-[40px] items-center justify-center rounded-md bg-[var(--app-primary)] px-6 text-sm font-semibold text-white transition hover:bg-[var(--app-primary-strong)]">Quay lại Tin nhắn</button>
                  </div>
                ) : messages.length === 0 ? (
                  <div className="flex h-full flex-col items-center justify-center text-center">
                    <div className="mb-5 flex h-20 w-20 items-center justify-center rounded-full border border-[var(--app-border)] bg-[var(--app-surface)] text-[var(--app-muted)]"><ChatIcon /></div>
                    <p className="text-2xl font-semibold text-[var(--app-text)]">{selectedConv ? getConversationName(selectedConv) : 'Cuộc trò chuyện'}</p>
                    <p className="mt-3 max-w-md text-sm leading-6 text-[var(--app-muted)]">Hãy nhắn tin để bắt đầu cuộc trò chuyện.</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {messages.map((msg, idx) => {
                      const isMine = msg.senderId === user?.id;
                      const showAvatar = !isMine && (idx === 0 || messages[idx - 1]?.senderId !== msg.senderId);
                      return (
                        <div key={msg.id} className={`flex items-end gap-2 ${isMine ? 'justify-end' : 'justify-start'}`}>
                          {!isMine ? (
                            <div className="mb-1 h-7 w-7 flex-shrink-0">
                              {showAvatar ? <Avatar src={msg.sender?.avatarUrl} name={msg.sender?.name} username={msg.sender?.username} size="xs" /> : null}
                            </div>
                          ) : null}
                          <div className="group max-w-[82%] sm:max-w-[70%]">
                            <div className={`rounded-[22px] px-4 py-3 text-sm leading-6 ${isMine ? 'rounded-br-[8px] bg-[var(--app-primary)] text-white' : 'rounded-bl-[8px] border border-[var(--app-border)] bg-[var(--app-surface)] text-[var(--app-text)]'}`}>
                                <div className={`chat-markdown-body ${isMine ? 'chat-markdown-mine text-white' : ''}`}>
                                  <ReactMarkdown
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
                                        <pre className={`my-2 overflow-x-auto rounded-lg p-3 text-xs ${isMine ? 'bg-black/20 text-white' : 'bg-[var(--app-bg-soft)] text-[var(--app-text)]'}`}>{children}</pre>
                                      ),
                                      blockquote: ({ children }) => (
                                        <blockquote className={`my-2 border-l-4 pl-3 italic ${isMine ? 'border-white/30 text-white/80' : 'border-[var(--app-border)] text-[var(--app-muted)]'}`}>{children}</blockquote>
                                      ),
                                      hr: () => <hr className={`my-3 ${isMine ? 'border-white/20' : 'border-[var(--app-border)]'}`} />,
                                    }}
                                  >
                                    {msg.content}
                                  </ReactMarkdown>
                                </div>
                            </div>
                            {msg.mediaUrl ? <img src={msg.mediaUrl} alt="" className="mt-2 max-h-60 rounded-lg object-cover" /> : null}
                            <p className="mt-1 px-1 text-[11px] text-[var(--app-muted)] opacity-0 transition group-hover:opacity-100">
                              {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                    {typingSummary ? (
                      <div className="flex items-end gap-2">
                        <div className="h-7 w-7" />
                        <div className="rounded-[22px] rounded-bl-[8px] border border-[var(--app-border)] bg-[var(--app-surface)] px-4 py-3">
                          <div className="flex gap-1">
                            <span className="h-2 w-2 animate-bounce rounded-full bg-[var(--app-muted)]" style={{ animationDelay: '0ms' }} />
                            <span className="h-2 w-2 animate-bounce rounded-full bg-[var(--app-muted)]" style={{ animationDelay: '150ms' }} />
                            <span className="h-2 w-2 animate-bounce rounded-full bg-[var(--app-muted)]" style={{ animationDelay: '300ms' }} />
                          </div>
                          <p className="mt-2 text-xs text-[var(--app-muted)]">{typingSummary} đang nhắn...</p>
                        </div>
                      </div>
                    ) : null}
                    <div ref={messagesEndRef} />
                  </div>
                )}
              </div>

              {!messagesError && (
                <form onSubmit={(e) => { e.preventDefault(); void sendCurrentMessage(); }} className="border-t border-[var(--app-border)] bg-[var(--app-surface)] px-4 py-4 sm:px-5">
                  <div className="flex items-center gap-3 rounded-full border border-[var(--app-border)] bg-[var(--app-surface)] px-4 py-2">
                    <button type="button" className="text-[var(--app-muted)] transition hover:text-[var(--app-accent)]"><HeartIcon /></button>
                    <input ref={inputRef} type="text" value={messageInput} onChange={(e) => { setMessageInput(e.target.value); if (selectedConversation) chatSocketService.sendTyping(selectedConversation, e.target.value.length > 0); }} onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); void sendCurrentMessage(); } }} placeholder="Tin nhắn..." className="min-h-[40px] flex-1 bg-transparent text-sm text-[var(--app-text)]" />
                    <button type="submit" className={`inline-flex min-h-[36px] items-center justify-center rounded-full px-3 text-sm font-semibold transition ${messageInput.trim() ? 'bg-[var(--app-primary)] text-white hover:bg-[var(--app-primary-strong)]' : 'text-[var(--app-primary)] hover:text-[var(--app-primary-strong)]'}`}>{messageInput.trim() ? 'Gửi' : <SendIcon />}</button>
                  </div>
                </form>
              )}
            </div>
          ) : (
            <div className="hidden flex-1 items-center justify-center bg-[var(--app-bg)] lg:flex">
              <div className="max-w-md px-6 text-center">
                <div className="mx-auto mb-5 flex h-24 w-24 items-center justify-center rounded-full border border-[var(--app-border)] bg-[var(--app-surface)] text-[var(--app-muted)]"><ChatIcon /></div>
                <p className="text-3xl font-semibold text-[var(--app-text)]">Tin nhắn của bạn</p>
                <p className="mt-4 text-sm leading-6 text-[var(--app-muted)]">Chọn một cuộc trò chuyện hoặc tạo một cuộc trò chuyện mới.</p>
                <div className="mt-5 flex items-center justify-center gap-3">
                  <button type="button" onClick={() => void handleOpenAssistantChat()} disabled={isOpeningAssistant} className="inline-flex min-h-[40px] items-center justify-center gap-2 rounded-md border border-[var(--app-border)] bg-[var(--app-primary-soft)] px-5 text-sm font-semibold text-[var(--app-primary)] transition hover:opacity-80 disabled:opacity-50"><SparkleIcon />{isOpeningAssistant ? 'Đang mở...' : '💬 Chat với AI'}</button>
                  <button type="button" onClick={() => setShowCompose(true)} className="inline-flex min-h-[40px] items-center justify-center rounded-md bg-[var(--app-primary)] px-4 text-sm font-semibold text-white transition hover:bg-[var(--app-primary-strong)]">Tạo cuộc trò chuyện</button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </AppShell>
  );
};

export default MessagesPage;
