import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import { AppShell } from '../components/layout/AppShell';
import { Avatar } from '../components/common/Avatar';
import { useAuth } from '../contexts/AuthContext';
import { chatService, Conversation } from '../services/chat.service';
import { chatSocketService } from '../services/chat-socket.service';
import { searchService } from '../services/search.service';
import { Message, User } from '../types';

/* ── Icons ── */
const ComposeIcon = () => (
  <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" />
    <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" />
  </svg>
);

const SendIcon = () => (
  <svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor">
    <path d="M22 2L11 13" strokeWidth="2" stroke="currentColor" fill="none" />
    <path d="M22 2L15 22l-4-9-9-4 20-7z" />
  </svg>
);

const HeartOutlineIcon = () => (
  <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M16.792 3.904A4.989 4.989 0 0121.5 9.122c0 3.072-2.652 4.959-5.197 7.222-2.512 2.243-3.865 3.469-4.303 3.752-.477-.309-1.834-1.527-4.303-3.752C5.152 14.08 2.5 12.194 2.5 9.122a4.989 4.989 0 014.708-5.218 4.21 4.21 0 013.675 1.941c.84 1.175.98 1.763 1.12 1.763s.278-.588 1.11-1.766a4.17 4.17 0 013.679-1.938z" />
  </svg>
);

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

  const loadConversations = useCallback(async () => {
    setIsLoadingConversations(true);
    try {
      const data = await chatService.getConversations();
      setConversations(data);
    } catch {
      toast.error('Failed to load conversations.');
    } finally {
      setIsLoadingConversations(false);
    }
  }, []);

  useEffect(() => { loadConversations(); }, [loadConversations]);
  useEffect(() => { setSelectedConversation(conversationId || null); }, [conversationId]);

  // Compose search
  useEffect(() => {
    if (!composeQuery.trim() || composeQuery.trim().length < 2) { setComposeResults([]); return; }
    const timer = window.setTimeout(async () => {
      try {
        const results = await searchService.searchUsers(composeQuery.trim(), 1, 8);
        setComposeResults(results.filter((u) => u.id !== user?.id && !selectedParticipants.some((p) => p.id === u.id)));
      } catch { toast.error('Failed to search.'); }
    }, 250);
    return () => window.clearTimeout(timer);
  }, [composeQuery, selectedParticipants, user?.id]);

  // WebSocket
  useEffect(() => {
    if (!token) return;
    chatSocketService.connect(token);
    const unsub1 = chatSocketService.on('newMessage', (message: Message) => {
      if (message.conversationId === selectedConversation) {
        setMessages((prev) => {
          if (prev.some((m) => m.id === message.id)) return prev;
          return [...prev, message];
        });
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
    const unsub3 = chatSocketService.on('userOnline', (data: any) => setOnlineUsers((p) => new Set([...p, data.userId])));
    const unsub4 = chatSocketService.on('userOffline', (data: any) => setOnlineUsers((p) => { const n = new Set(p); n.delete(data.userId); return n; }));
    const unsub5 = chatSocketService.on('membersOnline', (data: any) => {
      if (data.conversationId !== selectedConversation) return;
      setOnlineUsers((p) => new Set([...p, ...data.userIds]));
    });
    return () => { unsub1(); unsub2(); unsub3(); unsub4(); unsub5(); };
  }, [loadConversations, selectedConversation, token]);

  // Load messages
  useEffect(() => {
    if (!selectedConversation) return;
    setIsLoadingMessages(true);
    chatService.getMessages(selectedConversation)
      .then((data) => { setMessages(data.reverse()); chatSocketService.joinConversation(selectedConversation); chatSocketService.markAsRead(selectedConversation); })
      .catch(() => toast.error('Failed to load messages.'))
      .finally(() => setIsLoadingMessages(false));
    return () => { chatSocketService.leaveConversation(selectedConversation); };
  }, [selectedConversation]);

  // Auto scroll
  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages, typingUsers]);

  const selectedConv = useMemo(() => conversations.find((c) => c.id === selectedConversation), [conversations, selectedConversation]);

  const getConversationName = (conv: Conversation) => {
    if (conv.isGroup && conv.name) return conv.name;
    if (conv.members.length === 1) return conv.members[0].username || conv.members[0].name || 'Conversation';
    return conv.members.map((m) => m.username || m.name || 'Member').join(', ');
  };

  const getConversationAvatar = (conv: Conversation) => conv.members[0];

  const handleSelectConversation = (id: string) => {
    setSelectedConversation(id);
    navigate(`/messages/${id}`);
    setShowCompose(false);
  };

  const handleSendMessage = async (event: React.FormEvent) => {
    event.preventDefault();
    const content = messageInput.trim();
    if (!content || !selectedConversation) return;
    setMessageInput('');

    if (chatSocketService.isConnected()) {
      chatSocketService.sendMessage(selectedConversation, content);
      return;
    }

    try {
      const message = await chatService.sendMessage(selectedConversation, content);
      setMessages((prev) => [...prev, message]);
    } catch {
      toast.error('Failed to send message');
    }
  };

  const handleStartDirectConversation = async (participant: User) => {
    setIsCreatingConversation(true);
    try {
      const conv = await chatService.createConversation({ participantIds: [participant.id] });
      await loadConversations();
      setComposeQuery(''); setComposeResults([]); setShowCompose(false);
      navigate(`/messages/${conv.id}`);
    } catch { toast.error('Failed to start conversation.'); }
    finally { setIsCreatingConversation(false); }
  };

  const toggleParticipant = (p: User) => {
    setSelectedParticipants((prev) => prev.some((e) => e.id === p.id) ? prev.filter((e) => e.id !== p.id) : [...prev, p]);
    setComposeQuery(''); setComposeResults([]);
  };

  const handleCreateGroup = async () => {
    if (selectedParticipants.length < 2) { toast.error('Select at least 2 participants.'); return; }
    if (!groupName.trim()) { toast.error('Add a group name.'); return; }
    setIsCreatingConversation(true);
    try {
      const conv = await chatService.createConversation({ participantIds: selectedParticipants.map((p) => p.id), isGroup: true, name: groupName.trim() });
      await loadConversations();
      setSelectedParticipants([]); setGroupName(''); setShowCompose(false);
      navigate(`/messages/${conv.id}`);
    } catch { toast.error('Failed to create group.'); }
    finally { setIsCreatingConversation(false); }
  };

  const typingSummary = selectedConv?.members.filter((m) => typingUsers.has(m.id)).map((m) => m.username || m.name || 'Someone').join(', ');

  return (
    <AppShell fullWidth>
      <div className="messages-shell flex overflow-hidden">
        {/* ── Sidebar ── */}
        <div className={`flex-shrink-0 flex-col border-r border-[#dbdbdb] bg-white lg:w-[397px] ${selectedConversation ? 'hidden lg:flex' : 'flex w-full lg:w-[397px]'}`}>
          <div className="flex flex-col h-full">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4">
              <span className="text-base font-semibold">{user?.username || 'Messages'}</span>
              <button onClick={() => setShowCompose(!showCompose)} className="p-1 transition hover:opacity-70">
                <ComposeIcon />
              </button>
            </div>

            {/* Compose Panel */}
            {showCompose && (
              <div className="border-b border-[#dbdbdb] px-4 pb-4">
                <div className="mb-3 flex gap-2">
                  <button onClick={() => setComposeMode('direct')} className={`flex-1 rounded-lg py-1.5 text-xs font-semibold transition ${composeMode === 'direct' ? 'bg-[#0095f6] text-white' : 'bg-[#efefef] text-[#262626]'}`}>Direct</button>
                  <button onClick={() => setComposeMode('group')} className={`flex-1 rounded-lg py-1.5 text-xs font-semibold transition ${composeMode === 'group' ? 'bg-[#0095f6] text-white' : 'bg-[#efefef] text-[#262626]'}`}>Group</button>
                </div>
                {composeMode === 'group' && (
                  <input value={groupName} onChange={(e) => setGroupName(e.target.value)} placeholder="Group name"
                    className="mb-2 w-full rounded-sm border border-[#dbdbdb] bg-[#fafafa] px-3 py-2 text-sm outline-none" />
                )}
                {composeMode === 'group' && selectedParticipants.length > 0 && (
                  <div className="mb-2 flex flex-wrap gap-1">
                    {selectedParticipants.map((p) => (
                      <button key={p.id} onClick={() => toggleParticipant(p)} className="rounded-full bg-[#eff6ff] px-2 py-0.5 text-xs font-semibold text-[#0095f6]">
                        {p.username || p.name} ×
                      </button>
                    ))}
                  </div>
                )}
                <input value={composeQuery} onChange={(e) => setComposeQuery(e.target.value)} placeholder="Search"
                  className="w-full rounded-sm border border-[#dbdbdb] bg-[#fafafa] px-3 py-2 text-sm outline-none" />
                {composeResults.map((u) => (
                  <button key={u.id} onClick={() => composeMode === 'direct' ? handleStartDirectConversation(u) : toggleParticipant(u)}
                    className="flex w-full items-center gap-3 px-1 py-2 hover:bg-[#fafafa]">
                    <Avatar src={u.avatarUrl} name={u.name} username={u.username} size="sm" />
                    <div className="text-left"><p className="text-sm font-semibold">{u.username || u.name}</p></div>
                  </button>
                ))}
                {composeMode === 'group' && selectedParticipants.length >= 2 && (
                  <button onClick={handleCreateGroup} disabled={isCreatingConversation}
                    className="mt-2 w-full rounded-lg bg-[#0095f6] py-1.5 text-sm font-semibold text-white disabled:opacity-50">
                    {isCreatingConversation ? 'Creating...' : 'Create Group'}
                  </button>
                )}
              </div>
            )}

            {/* Conversation List */}
            <div className="flex-1 overflow-y-auto">
              {isLoadingConversations ? (
                <p className="px-6 py-4 text-sm text-[#8e8e8e]">Loading...</p>
              ) : conversations.length === 0 ? (
                <p className="px-6 py-4 text-sm text-[#8e8e8e]">No conversations yet.</p>
              ) : (
                conversations.map((conv) => {
                  const avatarMember = getConversationAvatar(conv);
                  const isOnline = conv.members.some((m) => onlineUsers.has(m.id));
                  const isActive = selectedConversation === conv.id;
                  return (
                    <button key={conv.id} onClick={() => handleSelectConversation(conv.id)}
                      className={`flex w-full items-center gap-3 px-6 py-3 text-left transition ${isActive ? 'bg-[#fafafa]' : 'hover:bg-[#fafafa]'}`}>
                      <div className="relative flex-shrink-0">
                        <Avatar src={avatarMember?.avatarUrl} name={avatarMember?.name || conv.name} username={avatarMember?.username} size="md" />
                        {isOnline && <span className="absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-white bg-green-500" />}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className={`truncate text-sm ${isActive ? 'font-bold' : 'font-semibold'}`}>{getConversationName(conv)}</p>
                        <p className="truncate text-xs text-[#8e8e8e]">{conv.lastMessage?.content || 'No messages yet'}</p>
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </div>
        </div>

        {/* ── Chat Area ── */}
        {selectedConv ? (
          <div className={`flex flex-1 flex-col bg-white ${selectedConversation ? 'flex' : 'hidden lg:flex'}`}>
            {/* Chat Header */}
            <div className="flex items-center gap-3 border-b border-[#dbdbdb] px-4 py-3">
              <button onClick={() => { setSelectedConversation(null); navigate('/messages'); }} className="mr-1 lg:hidden">
                <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="15 18 9 12 15 6" /></svg>
              </button>
              <div className="relative">
                <Avatar src={selectedConv.members[0]?.avatarUrl} name={selectedConv.members[0]?.name || selectedConv.name} username={selectedConv.members[0]?.username} size="sm" />
                {selectedConv.members.some((m) => onlineUsers.has(m.id)) && (
                  <span className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full border-2 border-white bg-green-500" />
                )}
              </div>
              <div>
                <p className="text-sm font-semibold">{getConversationName(selectedConv)}</p>
                <p className="text-xs text-[#8e8e8e]">
                  {selectedConv.members.some((m) => onlineUsers.has(m.id)) ? 'Active now' : 'Offline'}
                </p>
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto px-4 py-4">
              {isLoadingMessages ? (
                <div className="flex h-full items-center justify-center">
                  <p className="text-sm text-[#8e8e8e]">Loading...</p>
                </div>
              ) : messages.length === 0 ? (
                <div className="flex h-full flex-col items-center justify-center gap-3 text-center">
                  <Avatar src={selectedConv.members[0]?.avatarUrl} name={selectedConv.members[0]?.name || selectedConv.name} username={selectedConv.members[0]?.username} size="lg" />
                  <p className="font-semibold">{getConversationName(selectedConv)}</p>
                  <p className="text-sm text-[#8e8e8e]">Send a message to start this conversation</p>
                </div>
              ) : (
                <div className="space-y-1">
                  {messages.map((msg, idx) => {
                    const isMine = msg.senderId === user?.id;
                    const showAvatar = !isMine && (idx === 0 || messages[idx - 1]?.senderId !== msg.senderId);
                    return (
                      <div key={msg.id} className={`flex items-end gap-2 ${isMine ? 'justify-end' : 'justify-start'}`}>
                        {!isMine && (
                          <div className="mb-1 h-6 w-6 flex-shrink-0">
                            {showAvatar && <Avatar src={msg.sender?.avatarUrl} name={msg.sender?.name} username={msg.sender?.username} size="xs" />}
                          </div>
                        )}
                        <div className={`max-w-[66%] group`}>
                          <div className={`rounded-3xl px-4 py-2 text-sm ${isMine ? 'rounded-br-md bg-[#0095f6] text-white' : 'rounded-bl-md bg-[#efefef] text-[#262626]'}`}>
                            {msg.content}
                          </div>
                          {msg.mediaUrl && <img src={msg.mediaUrl} alt="" className="mt-1 max-h-60 rounded-2xl object-cover" />}
                          <p className="mt-0.5 hidden px-1 text-[10px] text-[#8e8e8e] group-hover:block">
                            {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                  {typingSummary && (
                    <div className="flex items-end gap-2">
                      <div className="h-6 w-6" />
                      <div className="rounded-3xl rounded-bl-md bg-[#efefef] px-4 py-2">
                        <div className="flex gap-1">
                          <span className="h-2 w-2 animate-bounce rounded-full bg-[#8e8e8e]" style={{ animationDelay: '0ms' }} />
                          <span className="h-2 w-2 animate-bounce rounded-full bg-[#8e8e8e]" style={{ animationDelay: '150ms' }} />
                          <span className="h-2 w-2 animate-bounce rounded-full bg-[#8e8e8e]" style={{ animationDelay: '300ms' }} />
                        </div>
                      </div>
                    </div>
                  )}
                  <div ref={messagesEndRef} />
                </div>
              )}
            </div>

            {/* Input */}
            <form onSubmit={handleSendMessage} className="flex items-center gap-3 border-t border-[#dbdbdb] px-4 py-3">
              <HeartOutlineIcon />
              <div className="flex flex-1 items-center rounded-full border border-[#dbdbdb] px-4 py-2">
                <input
                  ref={inputRef}
                  type="text"
                  value={messageInput}
                  onChange={(e) => {
                    setMessageInput(e.target.value);
                    if (selectedConversation) chatSocketService.sendTyping(selectedConversation, e.target.value.length > 0);
                  }}
                  onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSendMessage(e as any); } }}
                  placeholder="Message..."
                  className="flex-1 bg-transparent text-sm outline-none"
                />
              </div>
              {messageInput.trim() ? (
                <button type="submit" className="text-sm font-semibold text-[#0095f6] hover:text-[#1877f2]">Send</button>
              ) : (
                <button type="button" className="text-[#0095f6]"><SendIcon /></button>
              )}
            </form>
          </div>
        ) : (
          <div className="hidden flex-1 flex-col items-center justify-center lg:flex">
            <div className="mb-4 flex h-24 w-24 items-center justify-center rounded-full border-2 border-[#262626]">
              <svg viewBox="0 0 24 24" className="h-10 w-10" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" />
              </svg>
            </div>
            <p className="text-xl font-light">Your messages</p>
            <p className="mt-2 text-sm text-[#8e8e8e]">Send private photos and messages to a friend or group.</p>
            <button onClick={() => setShowCompose(true)} className="mt-4 rounded-lg bg-[#0095f6] px-4 py-2 text-sm font-semibold text-white hover:bg-[#1877f2]">
              Send message
            </button>
          </div>
        )}
      </div>
    </AppShell>
  );
};

export default MessagesPage;
