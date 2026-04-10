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
import { NotificationService } from './notification.service';
import { createSocketCorsOptions } from '../../common/cors.util';

@WebSocketGateway({
  cors: createSocketCorsOptions(),
  namespace: '/notifications',
})
export class NotificationGateway
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server: Server;

  private userSockets = new Map<string, Set<string>>();

  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly notificationService: NotificationService,
  ) {}

  afterInit(server: Server) {
    server.use((socket: Socket, next: (err?: Error) => void) => {
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
        socket.data.userId = payload.sub;
        return next();
      } catch (err: any) {
        const code =
          err?.name === 'TokenExpiredError' ? 'TOKEN_EXPIRED' : 'INVALID_TOKEN';
        console.warn(`[NotificationGateway] Auth rejected (${code}): ${err?.message}`);
        return next(new Error(code));
      }
    });

    console.log('Notification gateway initialized');
  }

  async handleConnection(client: Socket) {
    const userId = client.data.userId as string;
    if (!userId) {
      client.disconnect();
      return;
    }

    if (!this.userSockets.has(userId)) {
      this.userSockets.set(userId, new Set());
    }
    this.userSockets.get(userId)!.add(client.id);

    client.join(`user:${userId}`);

    try {
      const unreadCount = await this.notificationService.getUnreadCount(userId);
      client.emit('unreadCount', unreadCount);
    } catch (error) {
      console.warn(`Notification unread count error for user ${userId}:`, error);
    }

    console.log(`User ${userId} connected to notifications`);
  }

  handleDisconnect(client: Socket) {
    const userId = client.data.userId;
    if (userId && this.userSockets.has(userId)) {
      this.userSockets.get(userId)!.delete(client.id);
      if (this.userSockets.get(userId)!.size === 0) {
        this.userSockets.delete(userId);
      }
    }
    console.log(`Client disconnected from notifications: ${client.id}`);
  }

  emitToUser(userId: string, event: string, data: any) {
    this.server.to(`user:${userId}`).emit(event, data);
  }

  @SubscribeMessage('markAsRead')
  async handleMarkAsRead(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { notificationId: string },
  ) {
    const userId = client.data.userId;
    await this.notificationService.markAsRead(data.notificationId);

    // Update unread count
    const unreadCount = await this.notificationService.getUnreadCount(userId);
    client.emit('unreadCount', unreadCount);
  }

  @SubscribeMessage('markAllAsRead')
  async handleMarkAllAsRead(@ConnectedSocket() client: Socket) {
    const userId = client.data.userId;
    await this.notificationService.markAllAsRead(userId);

    // Update unread count
    client.emit('unreadCount', 0);
  }
}
