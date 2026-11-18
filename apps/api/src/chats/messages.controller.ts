import { Body, Controller, Delete, Inject, Param, Patch, Post, Req, UseGuards } from '@nestjs/common';
import type { Request } from 'express';
import { AuthGuard } from '../auth/auth.guard';
import { ChatGateway } from './chat.gateway';
import { ChatsService } from './chats.service';

@Controller('api/messages')
@UseGuards(AuthGuard)
export class MessagesController {
  constructor(
    @Inject(ChatsService) private readonly chats: ChatsService,
    @Inject(ChatGateway) private readonly gateway: ChatGateway,
  ) {}

  @Patch(':id')
  async edit(@Req() request: Request, @Param('id') id: string, @Body() body: unknown) {
    const message = await this.chats.edit(request.auth!.userId, id, body);
    this.gateway.emitMessageEdited(message);
    return message;
  }

  @Delete(':id')
  async remove(@Req() request: Request, @Param('id') id: string) {
    const message = await this.chats.deleteForEveryone(request.auth!.userId, id);
    this.gateway.emitMessageDeleted(message);
    return message;
  }

  @Post(':id/reactions')
  async react(@Req() request: Request, @Param('id') id: string, @Body() body: unknown) {
    const message = await this.chats.addReaction(request.auth!.userId, id, body);
    this.gateway.emitReaction('message:reactionAdded', message);
    return message;
  }

  @Delete(':id/reactions/:emoji')
  async unreact(@Req() request: Request, @Param('id') id: string, @Param('emoji') emoji: string) {
    const message = await this.chats.removeReaction(request.auth!.userId, id, emoji);
    this.gateway.emitReaction('message:reactionRemoved', message);
    return message;
  }
}
