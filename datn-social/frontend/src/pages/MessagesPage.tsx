import React, { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { chatService, Conversation } from '../services/chat.service';
import { chatSocketService } from '../services/chat-socket.service';
import { Message } from '../types';
import toast from 'react-hot-toast';

const MessagesPage: React.FC = () => {
  const { user, token } = useAuth();
  const { conversationId } = useParams();
  const navigate = useNavigate();

  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<string | null>(conversationId || null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [messageInput, setMessageInput] = useState('');
  const [onlineUsers, setOnlineUsers] = useState<Set<string>>(new Set());
  const [typingUsers, setTypingUsers] = useState<Set<string>>(new Set());
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Load conversations
  useEffect(() => {
    const loadConversations = async () => {
      try {
        const data = await chatService.getConversations();
        setConversations(data);
      } catch {
        toast.error('Failed to load conversations');
      }
    };

    loadConversations();
  }, []);

  // Connect to socket
  useEffect(() => {
    if (!token) return;

    chatSocketService.connect(token);

    // Listen for new messages
    const unsubscribeNewMessage = chatSocketService.on('newMessage', (message: Message) => {
      if (selectedConversation === message.conversationId) {
        setMessages((prev) => [...prev, message]);
      }
      // Reload conversations to update last message
      chatService.getConversations().then(setConversations);
    });

    // Listen for typing indicators
    const unsubscribeTyping = chatSocketService.on('userTyping', (data: any) => {
      if (data.conversationId === selectedConversation) {
        setTypingUsers((prev) => {
          const next = new Set(prev);
          if (data.isTyping) {
            next.add(data.userId);
          } else {
            next.delete(data.userId);
          }
          return next;
        });
      }
    });

    // Listen for online/offline
    const unsubscribeOnline = chatSocketService.on('userOnline', (data: any) => {
      setOnlineUsers((prev) => new Set(prev).add(data.userId));
    });

    const unsubscribeOffline = chatSocketService.on('userOffline', (data: any) => {
      setOnlineUsers((prev) => {
        const next = new Set(prev);
        next.delete(data.userId);
        return next;
      });
    });

    // Listen for online members in conversation
    const unsubscribeMembersOnline = chatSocketService.on('membersOnline', (data: any) => {
      if (data.conversationId === selectedConversation) {
        setOnlineUsers((prev) => new Set(prev.concat(data.userIds)));
      }
    });

    return () => {
      unsubscribeNewMessage();
      unsubscribeTyping();
      unsubscribeOnline();
      unsubscribeOffline();
      unsubscribeMembersOnline();
    };
  }, [token, selectedConversation]);

  // Load messages when conversation is selected
  useEffect(() => {
    if (!selectedConversation) return;

    const loadMessages = async () => {
      try {
        const data = await chatService.getMessages(selectedConversation);
        setMessages(data.reverse());
        chatSocketService.joinConversation(selectedConversation);
        chatSocketService.markAsRead(selectedConversation);

        // Scroll to bottom
        setTimeout(() => {
          messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
        }, 100);
      } catch {
        toast.error('Failed to load messages');
      }
    };

    loadMessages();

    return () => {
      if (selectedConversation) {
        chatSocketService.leaveConversation(selectedConversation);
      }
    };
  }, [selectedConversation]);

  // Auto scroll on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSelectConversation = (conversationId: string) => {
    setSelectedConversation(conversationId);
    navigate(`/messages/${conversationId}`);
  };

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!messageInput.trim() || !selectedConversation) return;

    chatSocketService.sendMessage(selectedConversation, messageInput);
    setMessageInput('');
  };

  const handleTyping = (value: string) => {
    if (selectedConversation) {
      chatSocketService.sendTyping(selectedConversation, value.length > 0);
    }
  };

  const getConversationName = (conv: Conversation): string => {
    if (conv.isGroup && conv.name) return conv.name;
    if (conv.members.length === 1) {
      const member = conv.members[0];
      return member.username ? `@${member.username}` : member.name || 'Unknown';
    }
    return conv.isGroup ? 'Group Chat' : 'Conversation';
  };

  const selectedConv = conversations.find((c) => c.id === selectedConversation);

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b">
        <div className="max-w-6xl mx-auto px-4 py-4">
          <h1 className="text-xl font-semibold">Messages</h1>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-6">
        <div className="bg-white rounded-lg shadow overflow-hidden flex" style={{ height: 'calc(100vh - 150px)' }}>
          {/* Conversations list */}
          <div className="w-80 border-r overflow-y-auto">
            <div className="p-4 border-b">
              <input
                type="text"
                placeholder="Search conversations..."
                className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="divide-y">
              {conversations.length === 0 ? (
                <p className="text-gray-500 text-center py-4">No conversations yet</p>
              ) : (
                conversations.map((conv) => (
                  <div
                    key={conv.id}
                    onClick={() => handleSelectConversation(conv.id)}
                    className={`p-4 hover:bg-gray-50 cursor-pointer flex items-center space-x-3 ${
                      selectedConversation === conv.id ? 'bg-blue-50' : ''
                    }`}
                  >
                    {conv.members.length === 1 ? (
                      conv.members[0].avatarUrl ? (
                        <img
                          src={conv.members[0].avatarUrl}
                          alt=""
                          className="w-12 h-12 rounded-full object-cover"
                        />
                      ) : (
                        <div className="w-12 h-12 rounded-full bg-gray-200 flex items-center justify-center">
                          <span className="text-gray-500">
                            {(conv.members[0].name || 'U')[0].toUpperCase()}
                          </span>
                        </div>
                      )
                    ) : (
                      <div className="w-12 h-12 rounded-full bg-blue-500 flex items-center justify-center">
                        <span className="text-white font-semibold">
                          {conv.members.slice(0, 2).map((m) => (m.name || 'U')[0]).join('')}
                        </span>
                      </div>
                    )}

                    <div className="flex-1 min-w-0">
                      <p className="font-semibold truncate">{getConversationName(conv)}</p>
                      <p className="text-sm text-gray-500 truncate">
                        {conv.lastMessage?.content || 'No messages yet'}
                      </p>
                    </div>

                    {onlineUsers.has(conv.members[0]?.id) && (
                      <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Chat area */}
          <div className="flex-1 flex flex-col">
            {selectedConv ? (
              <>
                {/* Header */}
                <div className="p-4 border-b flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    {!selectedConv.isGroup && selectedConv.members.length === 1 ? (
                      <>
                        {selectedConv.members[0].avatarUrl ? (
                          <img
                            src={selectedConv.members[0].avatarUrl}
                            alt=""
                            className="w-10 h-10 rounded-full object-cover"
                          />
                        ) : (
                          <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center">
                            <span className="text-gray-500">
                              {(selectedConv.members[0].name || 'U')[0].toUpperCase()}
                            </span>
                          </div>
                        )}
                        <div>
                          <p className="font-semibold">{getConversationName(selectedConv)}</p>
                          <p className="text-xs text-gray-500">
                            {onlineUsers.has(selectedConv.members[0].id) ? 'Online' : 'Offline'}
                          </p>
                        </div>
                      </>
                    ) : (
                      <p className="font-semibold">{getConversationName(selectedConv)}</p>
                    )}
                  </div>
                </div>

                {/* Messages */}
                <div className="flex-1 overflow-y-auto p-4 space-y-3">
                  {messages.length === 0 ? (
                    <p className="text-gray-500 text-center">No messages yet. Start the conversation!</p>
                  ) : (
                    messages.map((message) => {
                      const isMe = message.senderId === user?.id;
                      return (
                        <div key={message.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                          <div className={`max-w-xs lg:max-w-md ${isMe ? 'bg-blue-500 text-white' : 'bg-gray-200 text-gray-900'} rounded-2xl px-4 py-2`}>
                            {!isMe && selectedConv.members.length === 1 && (
                              <p className="text-xs opacity-70 mb-1">
                                {selectedConv.members[0].username ? `@${selectedConv.members[0].username}` : selectedConv.members[0].name}
                              </p>
                            )}
                            <p className="break-words">{message.content}</p>
                            {message.mediaUrl && (
                              <img src={message.mediaUrl} alt="Attachment" className="mt-2 rounded-lg max-w-full" />
                            )}
                            <p className={`text-xs mt-1 ${isMe ? 'text-blue-100' : 'text-gray-500'}`}>
                              {new Date(message.createdAt).toLocaleTimeString([], {
                                hour: '2-digit',
                                minute: '2-digit',
                              })}
                            </p>
                          </div>
                        </div>
                      );
                    })
                  )}

                  {/* Typing indicator */}
                  {typingUsers.size > 0 && (
                    <p className="text-sm text-gray-500 italic">
                      {selectedConv.members
                        .filter((m) => typingUsers.has(m.id))
                        .map((m) => m.username || m.name || 'Someone')
                        .join(', ')}{' '}
                      is typing...
                    </p>
                  )}

                  <div ref={messagesEndRef} />
                </div>

                {/* Input */}
                <form onSubmit={handleSendMessage} className="p-4 border-t">
                  <div className="flex items-center space-x-2">
                    <input
                      type="text"
                      value={messageInput}
                      onChange={(e) => {
                        setMessageInput(e.target.value);
                        handleTyping(e.target.value);
                      }}
                      placeholder="Type a message..."
                      className="flex-1 px-4 py-2 border rounded-full focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <button
                      type="submit"
                      disabled={!messageInput.trim()}
                      className="px-6 py-2 bg-blue-500 text-white rounded-full hover:bg-blue-600 disabled:opacity-50"
                    >
                      Send
                    </button>
                  </div>
                </form>
              </>
            ) : (
              <div className="flex-1 flex items-center justify-center">
                <p className="text-gray-500">Select a conversation to start messaging</p>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
};

export default MessagesPage;
