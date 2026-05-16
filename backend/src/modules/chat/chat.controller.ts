import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
  ParseUUIDPipe,
  BadRequestException,
} from '@nestjs/common';
import { ChatService } from './chat.service';
import { ChatGateway } from './chat.gateway';
import { CreateConversationDto } from './dto/create-conversation.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser, RequestUser } from '../auth/decorators/current-user.decorator';
import { limitPipe, pagePipe } from '../../common/pipes/bounded-int.pipe';

@Controller('conversations')
export class ChatController {
  constructor(
    private readonly chatService: ChatService,
    private readonly chatGateway: ChatGateway,
  ) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  create(@CurrentUser() user: RequestUser, @Body() dto: CreateConversationDto) {
    if (dto.isGroup) {
      if (dto.participantIds.length < 2) {
        throw new BadRequestException('Group conversations require at least two participants');
      }
      return this.chatService.createGroupConversation(user.id, dto);
    }

    if (dto.participantIds.length !== 1) {
      throw new BadRequestException('Direct conversations require exactly one participant');
    }

    return this.chatService.findOrCreateConversation(user.id, dto.participantIds[0]);
  }

  /** Phase 2: Open or create a direct conversation with the AI bot */
  @Post('assistant')
  @UseGuards(JwtAuthGuard)
  getAssistantConversation(@CurrentUser() user: RequestUser) {
    return this.chatService.getAssistantConversation(user.id);
  }


  @Get()
  @UseGuards(JwtAuthGuard)
  getConversations(@CurrentUser() user: RequestUser) {
    return this.chatService.getConversations(user.id);
  }

  @Get(':id/messages')
  @UseGuards(JwtAuthGuard)
  getMessages(
    @CurrentUser() user: RequestUser,
    @Param('id', ParseUUIDPipe) conversationId: string,
    @Query('page', pagePipe()) page = 1,
    @Query('limit', limitPipe(50)) limit = 50,
  ) {
    return this.chatService.getMessages(conversationId, user.id, page, limit);
  }

  @Get('unread-count')
  @UseGuards(JwtAuthGuard)
  getUnreadCount(@CurrentUser() user: RequestUser) {
    return this.chatService.getUnreadCount(user.id);
  }

  @Post(':id/leave')
  @UseGuards(JwtAuthGuard)
  leaveConversation(@CurrentUser() user: RequestUser, @Param('id', ParseUUIDPipe) conversationId: string) {
    return this.chatService.leaveConversation(conversationId, user.id);
  }

  @Post(':id/messages')
  @UseGuards(JwtAuthGuard)
  async sendMessage(
    @CurrentUser() user: RequestUser,
    @Param('id', ParseUUIDPipe) conversationId: string,
    @Body() dto: { content: string; mediaUrl?: string },
  ) {
    const message = await this.chatService.createMessage(
      conversationId,
      user.id,
      dto.content,
      dto.mediaUrl,
    );
    const assistantReply = await this.chatService.sendAssistantReplyIfNeeded(
      conversationId,
      user.id,
      dto.content,
    );

    if (this.chatGateway && this.chatGateway.server) {
      this.chatGateway.server.to(conversationId).emit('newMessage', message);
      if (assistantReply) {
        this.chatGateway.server.to(conversationId).emit('newMessage', assistantReply);
      }
    }

    return { message, assistantReply };
  }
}
