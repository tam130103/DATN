import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
  ParseIntPipe,
  ParseUUIDPipe,
} from '@nestjs/common';
import { ChatService } from './chat.service';
import { ChatGateway } from './chat.gateway';
import { CreateConversationDto } from './dto/create-conversation.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@Controller('conversations')
export class ChatController {
  constructor(
    private readonly chatService: ChatService,
    private readonly chatGateway: ChatGateway,
  ) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  create(@CurrentUser() user: any, @Body() dto: CreateConversationDto) {
    if (dto.isGroup) {
      return this.chatService.createGroupConversation(user.id, dto);
    }
    return this.chatService.findOrCreateConversation(user.id, dto.participantIds[0]);
  }

  /** Phase 2: Open or create a direct conversation with the AI bot */
  @Post('assistant')
  @UseGuards(JwtAuthGuard)
  getAssistantConversation(@CurrentUser() user: any) {
    return this.chatService.getAssistantConversation(user.id);
  }


  @Get()
  @UseGuards(JwtAuthGuard)
  getConversations(@CurrentUser() user: any) {
    return this.chatService.getConversations(user.id);
  }

  @Get(':id/messages')
  @UseGuards(JwtAuthGuard)
  getMessages(
    @CurrentUser() user: any,
    @Param('id', ParseUUIDPipe) conversationId: string,
    @Query('page', new ParseIntPipe({ optional: true })) page = 1,
    @Query('limit', new ParseIntPipe({ optional: true })) limit = 50,
  ) {
    return this.chatService.getMessages(conversationId, user.id, page, limit);
  }

  @Get('unread-count')
  @UseGuards(JwtAuthGuard)
  getUnreadCount(@CurrentUser() user: any) {
    return this.chatService.getUnreadCount(user.id);
  }

  @Post(':id/leave')
  @UseGuards(JwtAuthGuard)
  leaveConversation(@CurrentUser() user: any, @Param('id', ParseUUIDPipe) conversationId: string) {
    return this.chatService.leaveConversation(conversationId, user.id);
  }

  @Post(':id/messages')
  @UseGuards(JwtAuthGuard)
  async sendMessage(
    @CurrentUser() user: any,
    @Param('id', ParseUUIDPipe) conversationId: string,
    @Body() dto: { content: string; mediaUrl?: string },
  ) {
    const message = await this.chatService.createMessage(
      conversationId,
      user.id,
      dto.content,
      dto.mediaUrl,
    );

    if (this.chatGateway && this.chatGateway.server) {
      this.chatGateway.server.to(conversationId).emit('newMessage', message);
    }

    return { message };
  }
}
