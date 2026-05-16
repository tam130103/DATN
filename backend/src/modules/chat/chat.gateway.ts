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
import { Message } from './entities/message.entity';
import { createSocketCorsOptions } from '../../common/cors.util';
import { UserService } from '../user/user.service';
import { UserStatus } from '../user/entities/user.entity';

// Online users map: userId -> Set of socket ids
const onlineUsers = new Map<string, Set<string>>();

@WebSocketGateway({
  cors: createSocketCorsOptions(),
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
    private readonly userService: UserService,
  ) {}

  afterInit(server: Server) {
    // Auth middleware: runs BEFORE the connection is established.
    // Rejecting via next(error) fires 'connect_error' on the client
    // (vs client.disconnect() which fires 'disconnect' and suppresses auto-reconnect).
    server.use(async (socket: Socket, next: (err?: Error) => void) => {
      const token =
        socket.handshake.auth?.token ||
        socket.handshake.headers?.authorization?.replace('Bearer ', '');

      if (!token) {
        return next(new Error('NO_TOKEN'));
      }

      try {
        const payload = this.jwtService.verify(token, {
          secret: this.configService.get<string>('JWT_SECRET'),
        }) as { sub: string };

        const user = await this.userService.findById(payload.sub);
        if (user.status !== UserStatus.ACTIVE) {
          return next(new Error('ACCOUNT_BLOCKED'));
        }

        socket.data.userId = payload.sub;
        return next();
      } catch (err: any) {
        // Use a specific code so the frontend can detect token expiry
        const code =
          err?.name === 'TokenExpiredError' ? 'TOKEN_EXPIRED' : 'INVALID_TOKEN';
        console.warn(`[ChatGateway] Auth rejected (${code}): ${err?.message}`);
        return next(new Error(code));
      }
    });

    console.log('Chat gateway initialized');
  }

  private async ensureActiveSocketUser(client: Socket): Promise<string | null> {
    const userId = client.data.userId as string | undefined;
    if (!userId) {
      client.disconnect(true);
      return null;
    }

    try {
      const user = await this.userService.findById(userId);
      if (user.status !== UserStatus.ACTIVE) {
        client.emit('error', { code: 'ACCOUNT_BLOCKED', message: 'Account is blocked' });
        client.disconnect(true);
        return null;
      }
      return userId;
    } catch {
      client.emit('error', { code: 'INVALID_TOKEN', message: 'User is no longer available' });
      client.disconnect(true);
      return null;
    }
  }

  async handleConnection(client: Socket) {
    // userId is already validated and set by the middleware above
    const userId = await this.ensureActiveSocketUser(client);
    if (!userId) {
      // Shouldn't happen — middleware would have rejected already
      return;
    }

    // Add to online users
    if (!onlineUsers.has(userId)) {
      onlineUsers.set(userId, new Set());
    }
    onlineUsers.get(userId)!.add(client.id);

    // Join user's personal room for direct messages
    client.join(`user:${userId}`);

    // Notify others that user is online
    client.broadcast.emit('userOnline', { userId });

    // Send unread count (non-blocking)
    try {
      const unreadCount = await this.chatService.getUnreadCount(userId);
      client.emit('unreadCount', unreadCount);
    } catch (error) {
      console.error('Chat unread count error:', error);
    }

    console.log(`User ${userId} connected to chat`);
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
    const userId = await this.ensureActiveSocketUser(client);
    if (!userId) return;

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
  async handleLeaveConversation(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { conversationId: string },
  ) {
    const userId = await this.ensureActiveSocketUser(client);
    if (!userId) return;

    client.leave(data.conversationId);
  }

  @SubscribeMessage('sendMessage')
  async handleSendMessage(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { conversationId: string; content: string; mediaUrl?: string; clientRequestId?: string },
  ) {
    const userId = await this.ensureActiveSocketUser(client);
    if (!userId) return;

    try {
      // Save to DB first
      const message = await this.chatService.createMessage(
        data.conversationId,
        userId,
        data.content,
        data.mediaUrl,
      );

      // Broadcast to all conversation members' personal rooms so they get the event globally (for badges)
      const conversation = await this.chatService.findById(data.conversationId);
      for (const member of conversation.members) {
        if (!member.hasLeft) {
          this.server.to(`user:${member.userId}`).emit('newMessage', message);
        }
      }

      // We still emit to the conversation room just in case
      this.server.to(data.conversationId).emit('newMessage', message);

      // Phase 2: Trigger AI assistant reply (non-blocking)
      void this.triggerAssistantReply(data.conversationId, userId, data.content);
      client.emit('messageSent', { ok: true, clientRequestId: data.clientRequestId, message });

    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unable to send message';
      client.emit('error', { message });
      client.emit('messageSent', { ok: false, clientRequestId: data.clientRequestId, error: message });
    }
  }

  @SubscribeMessage('markAsRead')
  async handleMarkAsRead(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { conversationId: string },
  ) {
    const userId = await this.ensureActiveSocketUser(client);
    if (!userId) return;

    try {
      await this.chatService.markAsRead(data.conversationId, userId);
    } catch (error: any) {
      client.emit('error', { message: error?.message || 'Unable to mark conversation as read' });
      return;
    }

    // Notify others in conversation
    client.to(data.conversationId).emit('conversationRead', {
      conversationId: data.conversationId,
      userId,
    });
  }

  @SubscribeMessage('typing')
  async handleTyping(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { conversationId: string; isTyping: boolean },
  ) {
    const userId = await this.ensureActiveSocketUser(client);
    if (!userId) return;

    const isMember = await this.chatService.isMember(data.conversationId, userId);
    if (!isMember) {
      client.emit('error', { message: 'Not a member of this conversation' });
      return;
    }

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

  // ─── Phase 2: AI Chatbot Companion ────────────────────────────────

  /**
   * Ask ChatService to check if this conversation has the AI bot.
   * If yes, call Dify and broadcast the reply via socket.
   */
  private async triggerAssistantReply(
    conversationId: string,
    senderId: string,
    content: string,
  ): Promise<void> {
    try {
      // Emit "bot is typing" indicator
      this.server.to(conversationId).emit('userTyping', {
        conversationId,
        userId: 'ai-bot',
        isTyping: true,
      });

      const reply = await this.chatService.sendAssistantReplyIfNeeded(
        conversationId,
        senderId,
        content,
      );

      // Stop typing indicator
      this.server.to(conversationId).emit('userTyping', {
        conversationId,
        userId: 'ai-bot',
        isTyping: false,
      });

      if (reply) {
        // Broadcast to personal rooms so we get badge update globally
        const conversationInfo = await this.chatService.findById(conversationId);
        for (const member of conversationInfo.members) {
          if (!member.hasLeft) {
            this.server.to(`user:${member.userId}`).emit('newMessage', reply);
          }
        }
        // Emit to conversation room too
        this.server.to(conversationId).emit('newMessage', reply);
      }
    } catch (err) {
      this.server.to(conversationId).emit('userTyping', {
        conversationId,
        userId: 'ai-bot',
        isTyping: false,
      });
      console.error('AI assistant reply error:', err);
    }
  }
}
