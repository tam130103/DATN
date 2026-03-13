import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import { AppShell } from '../components/layout/AppShell';
import { Avatar } from '../components/common/Avatar';
import { StatePanel } from '../components/common/StatePanel';
import { useAuth } from '../contexts/AuthContext';
import { chatService, Conversation } from '../services/chat.service';
import { chatSocketService } from '../services/chat-socket.service';
import { searchService } from '../services/search.service';
import { Message, User } from '../types';

const MessagesPage: React.FC = () => {
  const { user, token } = useAuth();
  const { conversationId } = useParams();
  const navigate = useNavigate();
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<string | null>(conversationId || null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [messageInput, setMessageInput] = useState('');
  const [onlineUsers, setOnlineUsers] = useState<Set<string>>(new Set());
  const [typingUsers, setTypingUsers] = useState<Set<string>>(new Set());
  const [isLoadingConversations, setIsLoadingConversations] = useState(false);
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);
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

  useEffect(() => {
    loadConversations();
  }, [loadConversations]);

  useEffect(() => {
    setSelectedConversation(conversationId || null);
  }, [conversationId]);

  useEffect(() => {
    if (!composeQuery.trim() || composeQuery.trim().length < 2) {
      setComposeResults([]);
      return;
    }

    const timer = window.setTimeout(async () => {
      try {
        const results = await searchService.searchUsers(composeQuery.trim(), 1, 8);
        const filteredResults = results.filter(
          (entry) => entry.id !== user?.id && !selectedParticipants.some((participant) => participant.id === entry.id),
        );
        setComposeResults(filteredResults);
      } catch {
        toast.error('Failed to search users.');
      }
    }, 250);

    return () => {
      window.clearTimeout(timer);
    };
  }, [composeQuery, selectedParticipants, user?.id]);

  useEffect(() => {
    if (!token) return;

    chatSocketService.connect(token);

    const unsubscribeNewMessage = chatSocketService.on('newMessage', (message: Message) => {
      if (message.conversationId === selectedConversation) {
        setMessages((prev) => {
          // Prevent duplicate: HTTP response may have already added this message
          if (prev.some((m) => m.id === message.id)) return prev;
          return [...prev, message];
        });
      }
      loadConversations();
    });

    const unsubscribeTyping = chatSocketService.on('userTyping', (data: any) => {
      if (data.conversationId !== selectedConversation) return;
      setTypingUsers((prev) => {
        const next = new Set(prev);
        if (data.isTyping) {
          next.add(data.userId);
        } else {
          next.delete(data.userId);
        }
        return next;
      });
    });

    const unsubscribeOnline = chatSocketService.on('userOnline', (data: any) => {
      setOnlineUsers((prev) => new Set([...prev, data.userId]));
    });

    const unsubscribeOffline = chatSocketService.on('userOffline', (data: any) => {
      setOnlineUsers((prev) => {
        const next = new Set(prev);
        next.delete(data.userId);
        return next;
      });
    });

    const unsubscribeMembersOnline = chatSocketService.on('membersOnline', (data: any) => {
      if (data.conversationId !== selectedConversation) return;
      setOnlineUsers((prev) => new Set([...prev, ...data.userIds]));
    });

    return () => {
      unsubscribeNewMessage();
      unsubscribeTyping();
      unsubscribeOnline();
      unsubscribeOffline();
      unsubscribeMembersOnline();
    };
  }, [loadConversations, selectedConversation, token]);

  useEffect(() => {
    if (!selectedConversation) return;

    const loadMessages = async () => {
      setIsLoadingMessages(true);
      try {
        const data = await chatService.getMessages(selectedConversation);
        setMessages(data.reverse());
        chatSocketService.joinConversation(selectedConversation);
        chatSocketService.markAsRead(selectedConversation);
      } catch {
        toast.error('Failed to load messages.');
      } finally {
        setIsLoadingMessages(false);
      }
    };

    loadMessages();

    return () => {
      chatSocketService.leaveConversation(selectedConversation);
    };
  }, [selectedConversation]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, typingUsers]);

  const selectedConv = useMemo(
    () => conversations.find((conversation) => conversation.id === selectedConversation),
    [conversations, selectedConversation],
  );

  const getConversationName = (conversation: Conversation) => {
    if (conversation.isGroup && conversation.name) return conversation.name;
    if (conversation.members.length === 1) {
      const member = conversation.members[0];
      return member.username ? `@${member.username}` : member.name || 'Conversation';
    }
    return conversation.members.map((member) => member.name || member.username || 'Member').join(', ');
  };

  const handleSelectConversation = (id: string) => {
    setSelectedConversation(id);
    navigate(`/messages/${id}`);
  };

  const handleSendMessage = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!messageInput.trim() || !selectedConversation) return;

    const content = messageInput.trim();
    setMessageInput('');
    
    try {
      // Send via HTTP — the backend will broadcast via WebSocket,
      // and the WebSocket listener will add the message to state.
      // We don't add here to avoid duplicate messages.
      await chatService.sendMessage(selectedConversation, content);
    } catch {
      toast.error('Failed to send message');
    }
  };

  const handleStartDirectConversation = async (participant: User) => {
    setIsCreatingConversation(true);
    try {
      const conversation = await chatService.createConversation({ participantIds: [participant.id] });
      await loadConversations();
      setComposeQuery('');
      setComposeResults([]);
      navigate(`/messages/${conversation.id}`);
    } catch {
      toast.error('Failed to start conversation.');
    } finally {
      setIsCreatingConversation(false);
    }
  };

  const toggleParticipant = (participant: User) => {
    setSelectedParticipants((prev) =>
      prev.some((entry) => entry.id === participant.id)
        ? prev.filter((entry) => entry.id !== participant.id)
        : [...prev, participant],
    );
    setComposeQuery('');
    setComposeResults([]);
  };

  const handleCreateGroupConversation = async () => {
    if (selectedParticipants.length < 2) {
      toast.error('Select at least 2 participants for a group conversation.');
      return;
    }

    if (!groupName.trim()) {
      toast.error('Add a group name.');
      return;
    }

    setIsCreatingConversation(true);
    try {
      const conversation = await chatService.createConversation({
        participantIds: selectedParticipants.map((participant) => participant.id),
        isGroup: true,
        name: groupName.trim(),
      });
      await loadConversations();
      setSelectedParticipants([]);
      setGroupName('');
      setComposeQuery('');
      setComposeResults([]);
      navigate(`/messages/${conversation.id}`);
    } catch {
      toast.error('Failed to create group conversation.');
    } finally {
      setIsCreatingConversation(false);
    }
  };

  const typingSummary = selectedConv?.members
    .filter((member) => typingUsers.has(member.id))
    .map((member) => member.username || member.name || 'Someone')
    .join(', ');

  return (
    <AppShell
      title="Messages"
      description="Direct conversations and group threads stay live here with realtime delivery and typing state."
    >
      <div className="grid gap-6 xl:grid-cols-[340px,minmax(0,1fr)]">
        <section className="rounded-[32px] border border-white/70 bg-white/82 p-5 shadow-[0_24px_80px_-40px_rgba(15,23,42,0.28)] backdrop-blur lg:p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.35em] text-slate-400">Compose</p>
              <h2 className="mt-2 text-xl font-semibold text-slate-900">Start a conversation</h2>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setComposeMode('direct')}
                className={`rounded-2xl px-3 py-2 text-xs font-semibold uppercase tracking-[0.2em] transition ${
                  composeMode === 'direct' ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                Direct
              </button>
              <button
                type="button"
                onClick={() => setComposeMode('group')}
                className={`rounded-2xl px-3 py-2 text-xs font-semibold uppercase tracking-[0.2em] transition ${
                  composeMode === 'group' ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                Group
              </button>
            </div>
          </div>

          {composeMode === 'group' ? (
            <div className="mt-4 space-y-3">
              <input
                value={groupName}
                onChange={(event) => setGroupName(event.target.value)}
                placeholder="Group name"
                className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none transition focus:border-slate-300 focus:bg-white focus:ring-4 focus:ring-slate-900/5"
              />
              <div className="flex flex-wrap gap-2">
                {selectedParticipants.map((participant) => (
                  <button
                    key={participant.id}
                    type="button"
                    onClick={() => toggleParticipant(participant)}
                    className="rounded-full bg-cyan-50 px-3 py-1.5 text-sm font-medium text-cyan-700 transition hover:bg-cyan-100"
                  >
                    {participant.name || participant.username || 'Participant'} 
                  </button>
                ))}
              </div>
            </div>
          ) : null}

          <div className="mt-4 space-y-3">
            <input
              value={composeQuery}
              onChange={(event) => setComposeQuery(event.target.value)}
              placeholder={composeMode === 'direct' ? 'Search a user to message' : 'Search users to add'}
              className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none transition focus:border-slate-300 focus:bg-white focus:ring-4 focus:ring-slate-900/5"
            />

            {composeResults.length > 0 ? (
              <div className="space-y-2">
                {composeResults.map((entry) => (
                  <button
                    key={entry.id}
                    type="button"
                    onClick={() =>
                      composeMode === 'direct'
                        ? handleStartDirectConversation(entry)
                        : toggleParticipant(entry)
                    }
                    className="flex w-full items-center gap-3 rounded-2xl bg-slate-50 px-4 py-3 text-left transition hover:bg-slate-100"
                  >
                    <Avatar src={entry.avatarUrl} name={entry.name} username={entry.username} size="md" />
                    <div>
                      <p className="font-semibold text-slate-900">{entry.name || entry.username || 'User'}</p>
                      <p className="text-sm text-slate-500">{entry.username ? `@${entry.username}` : entry.email}</p>
                    </div>
                  </button>
                ))}
              </div>
            ) : null}

            {composeMode === 'group' ? (
              <button
                type="button"
                onClick={handleCreateGroupConversation}
                disabled={isCreatingConversation}
                className="w-full rounded-2xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:opacity-60"
              >
                {isCreatingConversation ? 'Creating group...' : 'Create group conversation'}
              </button>
            ) : null}
          </div>

          <div className="mt-6 border-t border-slate-100 pt-5">
            <p className="text-xs uppercase tracking-[0.35em] text-slate-400">Conversations</p>
            <div className="mt-4 space-y-2">
              {isLoadingConversations ? (
                <p className="rounded-2xl bg-slate-50 px-4 py-3 text-sm text-slate-500">Loading conversations...</p>
              ) : conversations.length === 0 ? (
                <p className="rounded-2xl bg-slate-50 px-4 py-3 text-sm text-slate-500">No conversations yet.</p>
              ) : (
                conversations.map((conversation) => (
                  <button
                    key={conversation.id}
                    type="button"
                    onClick={() => handleSelectConversation(conversation.id)}
                    className={`w-full rounded-[24px] px-4 py-3 text-left transition ${
                      selectedConversation === conversation.id
                        ? 'bg-slate-900 text-white'
                        : 'bg-slate-50 text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="font-semibold">{getConversationName(conversation)}</p>
                        <p className={`mt-1 text-sm ${selectedConversation === conversation.id ? 'text-white/70' : 'text-slate-500'}`}>
                          {conversation.lastMessage?.content || 'No messages yet'}
                        </p>
                      </div>
                      {conversation.members[0] && onlineUsers.has(conversation.members[0].id) ? (
                        <span className="h-3 w-3 rounded-full bg-emerald-400" />
                      ) : null}
                    </div>
                  </button>
                ))
              )}
            </div>
          </div>
        </section>

        <section className="rounded-[32px] border border-white/70 bg-white/82 shadow-[0_24px_80px_-40px_rgba(15,23,42,0.28)] backdrop-blur">
          {selectedConv ? (
            <div className="flex h-[70vh] flex-col">
              <div className="flex items-center justify-between gap-4 border-b border-slate-100 px-5 py-4 lg:px-6">
                <div className="flex items-center gap-3">
                  <Avatar
                    src={selectedConv.members[0]?.avatarUrl}
                    name={selectedConv.members[0]?.name || selectedConv.name}
                    username={selectedConv.members[0]?.username}
                    size="lg"
                  />
                  <div>
                    <p className="font-semibold text-slate-900">{getConversationName(selectedConv)}</p>
                    <p className="text-sm text-slate-500">
                      {selectedConv.members.some((member) => onlineUsers.has(member.id)) ? 'Someone is online' : 'Offline right now'}
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto px-5 py-5 lg:px-6">
                {isLoadingMessages ? (
                  <StatePanel title="Chat" description="Loading message history." />
                ) : messages.length === 0 ? (
                  <StatePanel title="Start" description="No messages yet. Send the first message to open the thread." />
                ) : (
                  <div className="space-y-4">
                    {messages.map((message) => {
                      const isMine = message.senderId === user?.id;
                      return (
                        <div key={message.id} className={`flex ${isMine ? 'justify-end' : 'justify-start'}`}>
                          <div className={`max-w-xl rounded-[28px] px-4 py-3 ${isMine ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-700'}`}>
                            {!isMine ? (
                              <p className="mb-1 text-xs uppercase tracking-[0.2em] opacity-60">
                                {message.sender?.username ? `@${message.sender.username}` : message.sender?.name || 'Member'}
                              </p>
                            ) : null}
                            <p className="whitespace-pre-wrap break-words text-sm leading-7">{message.content}</p>
                            {message.mediaUrl ? <img src={message.mediaUrl} alt="Message attachment" className="mt-3 max-h-64 rounded-2xl object-cover" /> : null}
                            <p className={`mt-2 text-xs ${isMine ? 'text-white/60' : 'text-slate-400'}`}>
                              {new Date(message.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                {typingSummary ? (
                  <p className="mt-4 text-sm italic text-slate-500">{typingSummary} is typing...</p>
                ) : null}
                <div ref={messagesEndRef} />
              </div>

              <form onSubmit={handleSendMessage} className="border-t border-slate-100 px-5 py-4 lg:px-6">
                <div className="flex items-center gap-3">
                  <input
                    type="text"
                    value={messageInput}
                    onChange={(event) => {
                      setMessageInput(event.target.value);
                      if (selectedConversation) {
                        chatSocketService.sendTyping(selectedConversation, event.target.value.length > 0);
                      }
                    }}
                    placeholder="Write a message..."
                    className="flex-1 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none transition focus:border-slate-300 focus:bg-white focus:ring-4 focus:ring-slate-900/5"
                  />
                  <button
                    type="submit"
                    className="rounded-2xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:opacity-60"
                  >
                    Send
                  </button>
                </div>
              </form>
            </div>
          ) : (
            <div className="flex h-[70vh] items-center justify-center px-6">
              <StatePanel title="Select" description="Pick a conversation from the left panel or start a new one." />
            </div>
          )}
        </section>
      </div>
    </AppShell>
  );
};

export default MessagesPage;
