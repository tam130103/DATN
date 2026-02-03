import {
  WebSocketGateway,
  SubscribeMessage,
  MessageBody,
  WebSocketServer,
  ConnectedSocket,
  OnGatewayInit,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { ChatService } from './chat.service';

// Online users map: userId -> Set of socket ids
const onlineUsers = new Map<string, Set<string>>();

@WebSocketGateway({
  cors: {
    origin: '*',
    credentials: true,
  },
  namespace: '/chat',
})
export class ChatGateway
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server: Server;

  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly chatService: ChatService,
  ) {}

  afterInit(server: Server) {
    console.log('Chat gateway initialized');
  }

  async handleConnection(client: Socket) {
    try {
      const token =
        client.handshake.auth.token ||
        client.handshake.headers.authorization?.replace('Bearer ', '');

      if (!token) {
        client.disconnect();
        return;
      }

      const payload = this.jwtService.verify(token, {
        secret: this.configService.get<string>('JWT_SECRET'),
      });

      const userId = payload.sub;
      client.data.userId = userId;

      // Add to online users
      if (!onlineUsers.has(userId)) {
        onlineUsers.set(userId, new Set());
      }
      onlineUsers.get(userId)!.add(client.id);

      // Join user's personal room for direct messages
      client.join(`user:${userId}`);

      // Notify others that user is online
      client.broadcast.emit('userOnline', { userId });

      // Send unread count
      const unreadCount = await this.chatService.getUnreadCount(userId);
      client.emit('unreadCount', unreadCount);

      console.log(`User ${userId} connected to chat`);
    } catch (error) {
      console.error('Chat connection error:', error);
      client.disconnect();
    }
  }

  handleDisconnect(client: Socket) {
    const userId = client.data.userId;

    if (userId && onlineUsers.has(userId)) {
      onlineUsers.get(userId)!.delete(client.id);

      // If no more sockets for this user, they're offline
      if (onlineUsers.get(userId)!.size === 0) {
        onlineUsers.delete(userId);
        this.server.emit('userOffline', { userId });
      }
    }

    console.log(`Client disconnected from chat: ${client.id}`);
  }

  @SubscribeMessage('joinConversation')
  async handleJoinConversation(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { conversationId: string },
  ) {
    const userId = client.data.userId;
    const isMember = await this.chatService.isMember(data.conversationId, userId);

    if (!isMember) {
      client.emit('error', { message: 'Not a member of this conversation' });
      return;
    }

    client.join(data.conversationId);

    // Get other online members
    const conversation = await this.chatService.findById(data.conversationId);
    const onlineMemberIds = conversation.members
      .filter((m) => m.userId !== userId && !m.hasLeft && onlineUsers.has(m.userId))
      .map((m) => m.userId);

    client.emit('membersOnline', {
      conversationId: data.conversationId,
      userIds: onlineMemberIds,
    });
  }

  @SubscribeMessage('leaveConversation')
  handleLeaveConversation(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { conversationId: string },
  ) {
    client.leave(data.conversationId);
  }

  @SubscribeMessage('sendMessage')
  async handleSendMessage(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { conversationId: string; content: string; mediaUrl?: string },
  ) {
    const userId = client.data.userId;

    try {
      // Save to DB first
      const message = await this.chatService.createMessage(
        data.conversationId,
        userId,
        data.content,
        data.mediaUrl,
      );

      // Broadcast to conversation room (members who joined)
      this.server.to(data.conversationId).emit('newMessage', message);
    } catch (error) {
      client.emit('error', { message: error.message });
    }
  }

  @SubscribeMessage('markAsRead')
  async handleMarkAsRead(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { conversationId: string },
  ) {
    const userId = client.data.userId;
    await this.chatService.markAsRead(data.conversationId, userId);

    // Notify others in conversation
    client.to(data.conversationId).emit('conversationRead', {
      conversationId: data.conversationId,
      userId,
    });
  }

  @SubscribeMessage('typing')
  handleTyping(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { conversationId: string; isTyping: boolean },
  ) {
    const userId = client.data.userId;
    client.to(data.conversationId).emit('userTyping', {
      conversationId: data.conversationId,
      userId,
      isTyping: data.isTyping,
    });
  }

  // Helper method to check if user is online
  isUserOnline(userId: string): boolean {
    return onlineUsers.has(userId);
  }

  // Helper to get online count for conversation
  async getOnlineMemberCount(conversationId: string): Promise<number> {
    const conversation = await this.chatService.findById(conversationId);
    return conversation.members.filter(
      (m) => !m.hasLeft && onlineUsers.has(m.userId),
    ).length;
  }
}
