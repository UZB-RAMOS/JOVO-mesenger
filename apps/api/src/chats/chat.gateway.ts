import { Inject } from '@nestjs/common';
import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
  WsException,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { AuthGuard } from '../auth/auth.guard';
import type { AuthUser } from '../auth/auth.types';
import { ChatsService } from './chats.service';

type AuthSocket = Socket & { data: { auth: AuthUser } };
type ActiveCall = { id: string; chatId: string; callerId: string; calleeId: string; mode: 'audio' | 'video'; timeout: ReturnType<typeof setTimeout> };

@WebSocketGateway({ cors: { origin: true, credentials: true }, transports: ['websocket', 'polling'] })
export class ChatGateway implements OnGatewayConnection {
  @WebSocketServer() server!: Server;
  private readonly calls = new Map<string, ActiveCall>();
  private readonly callByUser = new Map<string, string>();

  constructor(
    @Inject(AuthGuard) private readonly auth: AuthGuard,
    @Inject(ChatsService) private readonly chats: ChatsService,
  ) {}

  async handleConnection(client: Socket) {
    try {
      const token = client.handshake.auth?.token as string | undefined;
      const identity = await this.auth.authenticateToken(token);
      client.data.auth = identity;
      const chatIds = await this.chats.memberChatIds(identity.userId);
      await client.join(chatIds.map((id) => `chat:${id}`));
      client.emit('session:ready', { userId: identity.userId });
    } catch {
      client.emit('session:error', { message: 'Socket sessiyasi yaroqsiz' });
      client.disconnect(true);
    }
  }

  async joinChat(userId: string, chatId: string) {
    const sockets = await this.server.fetchSockets();
    await Promise.all(
      sockets.filter((socket) => socket.data.auth?.userId === userId).map((socket) => socket.join(`chat:${chatId}`)),
    );
  }

  emitMessage(message: any) {
    this.server.to(`chat:${message.chatId}`).emit('message:created', message);
    this.server.to(`chat:${message.chatId}`).emit('chat:updated', { chatId: message.chatId });
  }

  emitMessageEdited(message: any) {
    this.server.to(`chat:${message.chatId}`).emit('message:edited', message);
    this.server.to(`chat:${message.chatId}`).emit('chat:updated', { chatId: message.chatId });
  }

  emitMessageDeleted(message: any) {
    this.server.to(`chat:${message.chatId}`).emit('message:deleted', message);
    this.server.to(`chat:${message.chatId}`).emit('chat:updated', { chatId: message.chatId });
  }

  emitReaction(event: 'message:reactionAdded' | 'message:reactionRemoved', message: any) {
    this.server.to(`chat:${message.chatId}`).emit(event, message);
  }

  private async emitUser(userId: string, event: string, payload: unknown) {
    const sockets = await this.server.fetchSockets();
    for (const socket of sockets) if (socket.data.auth?.userId === userId) socket.emit(event, payload);
  }

  private finishCall(call: ActiveCall, event: string, reason?: string) {
    clearTimeout(call.timeout);
    this.calls.delete(call.id);
    this.callByUser.delete(call.callerId);
    this.callByUser.delete(call.calleeId);
    void this.emitUser(call.callerId, event, { callId: call.id, reason });
    void this.emitUser(call.calleeId, event, { callId: call.id, reason });
  }

  @SubscribeMessage('call:initiate')
  async initiateCall(@ConnectedSocket() socket: AuthSocket, @MessageBody() payload: { chatId?: string; mode?: 'audio' | 'video' }) {
    const callerId = socket.data.auth.userId;
    if (!payload?.chatId || !['audio', 'video'].includes(payload.mode ?? '')) throw new WsException('Qo‘ng‘iroq ma’lumoti noto‘g‘ri');
    try {
      const calleeId = await this.chats.directChatPeer(payload.chatId, callerId);
      if (this.callByUser.has(callerId) || this.callByUser.has(calleeId)) return { ok: false, error: 'Band' };
      const callId = crypto.randomUUID();
      const call = { id: callId, chatId: payload.chatId, callerId, calleeId, mode: payload.mode!, timeout: setTimeout(() => this.finishCall(call, 'call:timeout', 'Javob bo‘lmadi'), 45000) };
      this.calls.set(callId, call);
      this.callByUser.set(callerId, callId);
      this.callByUser.set(calleeId, callId);
      await this.emitUser(calleeId, 'call:incoming', { callId, chatId: call.chatId, callerId, mode: call.mode });
      return { ok: true, callId };
    } catch (error: any) {
      throw new WsException(error?.message ?? 'Qo‘ng‘iroq boshlanmadi');
    }
  }

  @SubscribeMessage('call:accept')
  async acceptCall(@ConnectedSocket() socket: AuthSocket, @MessageBody() payload: { callId: string }) {
    const call = this.calls.get(payload?.callId);
    if (!call || call.calleeId !== socket.data.auth.userId) throw new WsException('Qo‘ng‘iroq topilmadi yoki ruxsat yo‘q');
    clearTimeout(call.timeout);
    await this.emitUser(call.callerId, 'call:accepted', { callId: call.id, peerId: call.calleeId });
    return { ok: true };
  }

  @SubscribeMessage('call:reject')
  async rejectCall(@ConnectedSocket() socket: AuthSocket, @MessageBody() payload: { callId: string }) {
    const call = this.calls.get(payload?.callId);
    if (!call || ![call.callerId, call.calleeId].includes(socket.data.auth.userId)) throw new WsException('Qo‘ng‘iroq topilmadi yoki ruxsat yo‘q');
    this.finishCall(call, 'call:ended', 'Rad etildi');
    return { ok: true };
  }

  @SubscribeMessage('call:signal')
  async signalCall(@ConnectedSocket() socket: AuthSocket, @MessageBody() payload: { callId: string; kind: 'offer' | 'answer' | 'ice'; data: unknown }) {
    const call = this.calls.get(payload?.callId);
    if (!call || ![call.callerId, call.calleeId].includes(socket.data.auth.userId)) throw new WsException('Qo‘ng‘iroq topilmadi yoki ruxsat yo‘q');
    if (!['offer', 'answer', 'ice'].includes(payload.kind) || !payload.data || JSON.stringify(payload.data).length > 64_000) throw new WsException('Signal ma’lumoti noto‘g‘ri');
    const peerId = socket.data.auth.userId === call.callerId ? call.calleeId : call.callerId;
    await this.emitUser(peerId, 'call:signal', { callId: call.id, kind: payload.kind, data: payload.data });
    return { ok: true };
  }

  @SubscribeMessage('call:end')
  async endCall(@ConnectedSocket() socket: AuthSocket, @MessageBody() payload: { callId: string }) {
    const call = this.calls.get(payload?.callId);
    if (!call || ![call.callerId, call.calleeId].includes(socket.data.auth.userId)) throw new WsException('Qo‘ng‘iroq topilmadi yoki ruxsat yo‘q');
    this.finishCall(call, 'call:ended', 'Qo‘ng‘iroq tugadi');
    return { ok: true };
  }

  @SubscribeMessage('message:send')
  async send(@ConnectedSocket() socket: AuthSocket, @MessageBody() payload: { chatId: string; clientMessageId: string; content: string; replyToId?: string }) {
    try {
      const message = await this.chats.send(socket.data.auth.userId, payload.chatId, payload);
      this.emitMessage(message);
      return { ok: true, message };
    } catch (error: any) {
      throw new WsException(error?.message ?? 'Xabar yuborilmadi');
    }
  }

  @SubscribeMessage('chat:typing')
  async typing(@ConnectedSocket() socket: AuthSocket, @MessageBody() payload: { chatId: string; active: boolean }) {
    try {
      await this.chats.assertMember(payload.chatId, socket.data.auth.userId);
      socket.to(`chat:${payload.chatId}`).emit('chat:typing', {
        chatId: payload.chatId,
        userId: socket.data.auth.userId,
        active: Boolean(payload.active),
      });
      return { ok: true };
    } catch (error: any) {
      throw new WsException(error?.message ?? 'Ruxsat yo‘q');
    }
  }

  @SubscribeMessage('chat:read')
  async read(@ConnectedSocket() socket: AuthSocket, @MessageBody() payload: { chatId: string; messageId: string }) {
    try {
      const receipt = await this.chats.markRead(socket.data.auth.userId, payload.chatId, payload);
      this.server.to(`chat:${payload.chatId}`).emit('chat:read', receipt);
      return { ok: true, receipt };
    } catch (error: any) {
      throw new WsException(error?.message ?? 'O‘qilgan holati saqlanmadi');
    }
  }
}
