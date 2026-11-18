import { Body, Controller, Get, Inject, Param, Post, Put, Query, Req, UseGuards } from '@nestjs/common';
import type { Request } from 'express';
import type { SendMessageInput } from '@jovo/shared';
import { AuthGuard } from '../auth/auth.guard';
import { ChatGateway } from './chat.gateway';
import { ChatsService } from './chats.service';

@Controller('api/chats')
@UseGuards(AuthGuard)
export class ChatsController {
  constructor(
    @Inject(ChatsService) private readonly chats: ChatsService,
    @Inject(ChatGateway) private readonly gateway: ChatGateway,
  ) {}

  @Get()
  list(@Req() request: Request) {
    return this.chats.list(request.auth!.userId);
  }

  @Post('direct')
  async direct(@Req() request: Request, @Body() body: unknown) {
    const chat = await this.chats.createDirect(request.auth!.userId, body);
    await this.gateway.joinChat(request.auth!.userId, chat.id);
    if (chat.peer) await this.gateway.joinChat(chat.peer.id, chat.id);
    return chat;
  }

  @Get(':id')
  get(@Req() request: Request, @Param('id') id: string) {
    return this.chats.get(id, request.auth!.userId);
  }

  @Get(':id/messages')
  messages(@Req() request: Request, @Param('id') id: string, @Query('cursor') cursor?: string, @Query('limit') limit?: string) {
    return this.chats.messages(id, request.auth!.userId, cursor, limit);
  }

  @Post(':id/messages')
  async send(@Req() request: Request, @Param('id') id: string, @Body() body: SendMessageInput) {
    const message = await this.chats.send(request.auth!.userId, id, body);
    this.gateway.emitMessage(message);
    return message;
  }

  @Post(':id/read')
  async read(@Req() request: Request, @Param('id') id: string, @Body() body: unknown) {
    const receipt = await this.chats.markRead(request.auth!.userId, id, body);
    this.gateway.server.to(`chat:${id}`).emit('chat:read', receipt);
    return receipt;
  }

  @Put(':id/draft')
  draft(@Req() request: Request, @Param('id') id: string, @Body('content') content = '') {
    return this.chats.saveDraft(request.auth!.userId, id, content);
  }
}
