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
import { Inject, forwardRef } from '@nestjs/common';
import { NotificationService } from './notification.service';
import { createSocketCorsOptions } from '../../common/cors.util';
import { UserService } from '../user/user.service';
import { UserStatus } from '../user/entities/user.entity';

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
    @Inject(forwardRef(() => UserService))
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
        console.warn(`[NotificationGateway] Auth rejected (${code}): ${err?.message}`);
        return next(new Error(code));
      }
    });

    console.log('Notification gateway initialized');
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
    if (event === 'notification' && !data) {
      return;
    }

    this.server.to(`user:${userId}`).emit(event, data);
  }

  @SubscribeMessage('markAsRead')
  async handleMarkAsRead(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { notificationId: string },
  ) {
    const userId = await this.ensureActiveSocketUser(client);
    if (!userId) return;

    try {
      await this.notificationService.markAsRead(data.notificationId, userId);
    } catch (error: any) {
      client.emit('error', { message: error?.message || 'Unable to mark notification as read' });
      return;
    }

    // Update unread count
    const unreadCount = await this.notificationService.getUnreadCount(userId);
    client.emit('unreadCount', unreadCount);
  }

  @SubscribeMessage('markAllAsRead')
  async handleMarkAllAsRead(@ConnectedSocket() client: Socket) {
    const userId = await this.ensureActiveSocketUser(client);
    if (!userId) return;

    await this.notificationService.markAllAsRead(userId);

    // Update unread count
    client.emit('unreadCount', 0);
  }
}
