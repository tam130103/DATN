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
    const userId = await this.ensureActiveSocketUser(client);
    if (!userId) {
      return;
    }

    if (!onlineUsers.has(userId)) {
      onlineUsers.set(userId, new Set());
    }
    onlineUsers.get(userId)!.add(client.id);

    client.join(`user:${userId}`);

    client.broadcast.emit('userOnline', { userId });

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

    if (!data.content?.trim()) {
      client.emit('error', { message: 'Nội dung tin nhắn không được để trống.' });
      return;
    }

    try {
      const message = await this.chatService.createMessage(
        data.conversationId,
        userId,
        data.content,
        data.mediaUrl,
      );

      this.server.to(data.conversationId).emit('newMessage', message);

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

  isUserOnline(userId: string): boolean {
    return onlineUsers.has(userId);
  }

  async getOnlineMemberCount(conversationId: string): Promise<number> {
    const conversation = await this.chatService.findById(conversationId);
    return conversation.members.filter(
      (m) => !m.hasLeft && onlineUsers.has(m.userId),
    ).length;
  }

  private async triggerAssistantReply(
    conversationId: string,
    senderId: string,
    content: string,
  ): Promise<void> {
    try {
      const botUserId = await this.userService.getAssistantBotUserId();

      this.server.to(conversationId).emit('userTyping', {
        conversationId,
        userId: botUserId,
        isTyping: true,
      });

      const reply = await this.chatService.sendAssistantReplyIfNeeded(
        conversationId,
        senderId,
        content,
      );

      this.server.to(conversationId).emit('userTyping', {
        conversationId,
        userId: botUserId,
        isTyping: false,
      });

      if (reply) {
        const conversationInfo = await this.chatService.findById(conversationId);
        for (const member of conversationInfo.members) {
          if (!member.hasLeft) {
            this.server.to(`user:${member.userId}`).emit('conversationUpdated', {
              conversationId,
              lastMessage: reply,
            });
          }
        }
        this.server.to(conversationId).emit('newMessage', reply);
      }
    } catch (err) {
      this.server.to(conversationId).emit('userTyping', {
        conversationId,
        userId: await this.userService.getAssistantBotUserId(),
        isTyping: false,
      });
      console.error('AI assistant reply error:', err);
    }
  }
}