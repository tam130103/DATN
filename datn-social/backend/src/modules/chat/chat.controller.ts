import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
  ParseIntPipe,
} from '@nestjs/common';
import { ChatService } from './chat.service';
import { CreateConversationDto } from './dto/create-conversation.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@Controller('conversations')
@UseGuards(JwtAuthGuard)
export class ChatController {
  constructor(private readonly chatService: ChatService) {}

  @Post()
  create(@CurrentUser() user: any, @Body() dto: CreateConversationDto) {
    if (dto.isGroup) {
      return this.chatService.createGroupConversation(user.id, dto);
    }
    return this.chatService.findOrCreateConversation(user.id, dto.participantIds[0]);
  }

  @Get()
  getConversations(@CurrentUser() user: any) {
    return this.chatService.getConversations(user.id);
  }

  @Get(':id/messages')
  getMessages(
    @CurrentUser() user: any,
    @Param('id') conversationId: string,
    @Query('page', new ParseIntPipe({ optional: true })) page = 1,
    @Query('limit', new ParseIntPipe({ optional: true })) limit = 50,
  ) {
    return this.chatService.getMessages(conversationId, user.id, page, limit);
  }

  @Get('unread-count')
  getUnreadCount(@CurrentUser() user: any) {
    return this.chatService.getUnreadCount(user.id);
  }

  @Post(':id/leave')
  leaveConversation(@CurrentUser() user: any, @Param('id') conversationId: string) {
    return this.chatService.leaveConversation(conversationId, user.id);
  }
}
