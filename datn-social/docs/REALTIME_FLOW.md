# Real-time Communication Flow

## Overview

The application uses Socket.IO for real-time communication. There are two separate namespaces:
1. **`/notifications`** - For notifications and unread count updates
2. **`/chat`** - For messaging and online status

## Notification Flow

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                          NOTIFICATION FLOW                                      │
└─────────────────────────────────────────────────────────────────────────────────┘

    ┌──────────────┐                        ┌──────────────────────────────────┐
    │   USER A     │                        │          SERVER                 │
    │  (Sender)    │                        │        NestJS Backend           │
    └──────┬───────┘                        └─────────────┬────────────────────┘
           │                                              │
           │  1. ACTION                                  │
           │  - Like post                               │
           │  - Comment on post                         │
           │  - Follow user                             │
           │  ──────────────────────────────────────>   │
           │                                              │
           │                                              │  2. PROCESS
           │                                              │  EngagementService
           │                                              │  - Create notification
           │                                              │  - Check user prefs
           │                                              │  - Save to DB
           │                                              │
           │                                              │
           │                           3. EMIT <──────────┤
           │  <────────────────────────────────────────   │
           │                                              │  NotificationGateway
           │  4. RECEIVE                                 │  - Emit to User B's room
           │  notification event                         │
           │                                              │
           │                                              │
    ┌──────┴───────┐                                    │
    │   USER B     │                                    │
    │ (Recipient)  │                                    │
    └──────────────┘                                    │
                                                         │
                                                         │  5. EMIT unreadCount
                                                         │  ───────────────────>
                        ┌──────────────┐                │
                        │   USER B     │ <──────────────┘
                        │  (Client)    │                │
                        └──────┬───────┘                │
                               │                         │
                               │  6. UPDATE UI          │
                               │  - Show notification   │
                               │  - Update badge count  │
                               │                         │
                               │  7. MARK AS READ        │
                               │  ───────────────────────>
                               │                         │
                               │                         │  8. SOCKET EVENT
                               │                         │  markAsRead
                               │                         │
                               │                         │
                               │  9. UPDATE COUNT <──────┘
                               │  ──────────────────────>
```

## Notification Flow - Step by Step

### 1. User Action (Sender)
- User A likes a post from User B
- Frontend: `postService.like(postId)`
- HTTP POST: `/api/posts/:id/like`

### 2. Server Processing
```typescript
// EngagementService.likePost()
async likePost(userId: string, postId: string) {
  // Create like in database
  const like = this.likeRepository.create({ userId, postId });
  await this.likeRepository.save(like);

  // Create notification
  await this.notificationService.create(
    post.userId,      // Recipient
    userId,           // Sender
    'LIKE',           // Type
    { postId }        // Data
  );
}
```

### 3. Notification Creation
```typescript
// NotificationService.create()
async create(recipientId, senderId, type, data) {
  // Skip self-notification
  if (recipientId === senderId) return null;

  // Check user preferences
  const recipient = await this.userService.findById(recipientId);
  if (!recipient.notificationEnabled) return null;

  // Create and save
  const notification = this.notificationRepository.create({
    recipientId,
    senderId,
    type,
    data,
    isRead: false,
  });
  await this.notificationRepository.save(notification);

  // Emit via WebSocket
  this.notificationGateway.emitToUser(recipientId, 'notification', notification);
}
```

### 4. Gateway Emission
```typescript
// NotificationGateway
@WebSocketGateway({ namespace: '/notifications' })
export class NotificationGateway {
  @WebSocketServer()
  server: Server;

  emitToUser(userId: string, event: string, data: any) {
    this.server.to(userId).emit(event, data);
  }

  // Client joins their user room on connection
  handleConnection(client: Socket) {
    const userId = this.jwtService.verify(client.handshake.auth.token).sub;
    client.join(userId);
  }
}
```

### 5. Client Reception
```typescript
// notificationService.ts
connect(token: string) {
  this.socket = io(`${API_URL}/notifications`, { auth: { token } });

  this.socket.on('notification', (notification) => {
    this.emit('notification', notification);
  });

  this.socket.on('unreadCount', (count) => {
    this.emit('unreadCount', count);
  });
}

// NotificationBell.tsx
useEffect(() => {
  const unsubscribe = notificationService.on('notification', (notif) => {
    setUnreadCount(prev => prev + 1);
    toast(`New ${notif.type.toLowerCase()} from ${notif.sender.name}`);
  });
  return unsubscribe;
}, []);
```

## Chat Flow

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                            CHAT MESSAGE FLOW                                    │
└─────────────────────────────────────────────────────────────────────────────────┘

    ┌──────────────┐                        ┌──────────────────────────────────┐
    │   USER A     │                        │          SERVER                 │
    │  (Sender)    │                        │        NestJS Backend           │
    └──────┬───────┘                        └─────────────┬────────────────────┘
           │                                              │
           │  1. SEND MESSAGE                             │
           │  socket.emit('message', {...})              │
           │  ──────────────────────────────────────>   │
           │                                              │
           │                                              │  2. VERIFY
           │                                              │  - JWT token
           │                                              │  - Conversation member
           │                                              │
           │                                              │  3. SAVE TO DB
           │                                              │  Message saved
           │                                              │
           │                           4. EMIT <──────────┤
           │  <────────────────────────────────────────   │  ChatGateway
           │  'message' to conversation room              │  - Emit to all members
           │                                              │  - Update online status
           │                                              │
    ┌──────┴───────┐                                    │
    │   USER B     │ <──────────────────────────────────┘
    │ (Recipient)  │                                    │
    └──────────────┘                                    │
                                                         │
                        ┌──────────────┐                │
                        │   USER B     │                │
                        │  (Client)    │                │
                        └──────┬───────┘                │
                               │                         │
                               │  5. DISPLAY MESSAGE    │
                               │  - Append to chat      │
                               │  - Scroll to bottom    │
                               │                         │
                               │  6. START TYPING        │
                               │  ───────────────────────>
                               │                         │
                               │  7. EMIT 'typing' <─────┘
                               │  ──────────────────────>
                        ┌──────┴───────┐
                        │   USER A     │
                        │  (Sender)    │
                        └──────────────┘
                               │
                               │  8. SHOW "typing..."
                               │
                               │  9. STOP TYPING
                               │  ───────────────────────>
                               │                         │
                               │  10. EMIT 'stopTyping' <─┘
                               │  ──────────────────────>
```

## Chat Flow - Step by Step

### 1. Client Sends Message
```typescript
// MessagesPage.tsx
const sendMessage = () => {
  if (!message.trim()) return;

  chatSocketService.sendMessage(conversationId, message);
  setMessage('');
};
```

### 2. Socket Service
```typescript
// chatSocketService.ts
sendMessage(conversationId: string, content: string, mediaUrl?: string) {
  this.socket?.emit('message', {
    conversationId,
    content,
    mediaUrl,
  });
}
```

### 3. Server Gateway
```typescript
// ChatGateway
@WebSocketGateway({ namespace: '/chat' })
export class ChatGateway implements OnGatewayInit {
  @WebSocketServer()
  server: Server;

  private onlineUsers = new Map<string, string>(); // userId -> socketId

  @SubscribeMessage('message')
  async handleMessage(client: Socket, payload: SendMessageDto) {
    const userId = client.data.userId;

    // Verify member
    const member = await this.chatService.verifyMember(payload.conversationId, userId);
    if (!member || member.hasLeft) {
      throw new WsException('Not a member of this conversation');
    }

    // Save message
    const message = await this.chatService.createMessage({
      ...payload,
      senderId: userId,
    });

    // Emit to conversation
    this.server.to(payload.conversationId).emit('message', message);
  }

  handleConnection(client: Socket) {
    const userId = client.handshake.auth.userId;
    client.data.userId = userId;
    this.onlineUsers.set(userId, client.id);

    // Join all user's conversations
    this.joinUserConversations(client, userId);
  }
}
```

### 4. Online Status Tracking
```typescript
// ChatGateway - handleConnection
async handleConnection(client: Socket) {
  const userId = client.data.userId;

  // Notify others that user is online
  const conversations = await this.chatService.getUserConversations(userId);
  conversations.forEach(conv => {
    this.server.to(conv.id).emit('online', { userId, conversationId: conv.id });
  });
}

handleDisconnect(client: Socket) {
  const userId = client.data.userId;
  this.onlineUsers.delete(userId);

  // Notify others that user is offline
  this.server.emit('offline', { userId });
}
```

### 5. Client Reception
```typescript
// MessagesPage.tsx
useEffect(() => {
  const unsubscribeMessage = chatSocketService.on('message', (newMessage) => {
    if (newMessage.conversationId === conversationId) {
      setMessages(prev => [...prev, newMessage]);
    }
  });

  const unsubscribeOnline = chatSocketService.on('online', ({ userId }) => {
    setOnlineUsers(prev => [...prev, userId]);
  });

  return () => {
    unsubscribeMessage();
    unsubscribeOnline();
  };
}, [conversationId]);
```

## Connection Lifecycle

### Initial Connection
```
Client                                    Server
  │                                         │
  │  1. CONNECT (with JWT)                  │
  │  ────────────────────────────────────>  │
  │                                         │
  │                                         │  2. VERIFY TOKEN
  │                                         │  - Extract userId
  │                                         │
  │  3. CONNECTION ESTABLISHED <────────────┤
  │  <────────────────────────────────────  │
  │                                         │
  │  4. JOIN ROOM(s)                        │
  │  ────────────────────────────────────>  │
  │  - User joins their userId room         │
  │  - User joins conversation rooms        │
  │                                         │
```

### Disconnection & Reconnection
```
Client                                    Server
  │                                         │
  │  1. DISCONNECT (network issue)          │
  │  <───────────────────────────────────  │
  │                                         │
  │  2. CLEANUP                             │
  │  - Remove from onlineUsers              │
  │  - Notify others of offline status      │
  │                                         │
  │  3. AUTO-RECONNECT (client side)        │
  │  ────────────────────────────────────>  │
  │  - Retry with backoff                   │
  │  - Max 5 attempts                       │
  │                                         │
  │  4. RECONNECTED <───────────────────────┤
  │  <────────────────────────────────────  │
  │                                         │
  │  5. RE-JOIN ROOMS                       │
  │  ────────────────────────────────────>  │
  │                                         │
  │  6. CATCH UP                            │
  │  - Fetch missed messages                │
  │  - Sync unread count                    │
```

## Error Handling

### Connection Errors
```typescript
// Client-side
this.socket = io(API_URL, {
  auth: { token },
  reconnection: true,
  reconnectionDelay: 1000,
  reconnectionAttempts: 5,
});

this.socket.on('connect_error', (error) => {
  console.error('Connection error:', error);
  // Fallback to HTTP polling or show error
});

this.socket.on('disconnect', (reason) => {
  if (reason === 'io server disconnect') {
    // Server forcibly disconnected - need to re-authenticate
    this.socket.connect();
  }
});
```

### Message Errors
```typescript
// Server-side
@SubscribeMessage('message')
async handleMessage(client: Socket, payload: any) {
  try {
    // Validate and process
    const message = await this.chatService.createMessage(payload);
    this.server.to(payload.conversationId).emit('message', message);
  } catch (error) {
    // Emit error back to sender
    client.emit('error', { message: error.message });
  }
}
```

## Performance Considerations

1. **Room-based Emission**: Only emit to relevant users (conversation members)
2. **Online Map**: In-memory tracking for fast lookups
3. **Connection Pooling**: Reuse connections for multiple namespaces
4. **Message Batching**: Consider batching for high-frequency events
5. **Heartbeat**: Socket.IO handles ping/pong automatically
