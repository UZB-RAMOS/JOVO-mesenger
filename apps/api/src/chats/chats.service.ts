import { ForbiddenException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '../generated/prisma/client';
import {
  createDirectChatSchema,
  editMessageSchema,
  markReadSchema,
  messageReactionSchema,
  sendMessageSchema,
  type MessageDto,
  type SendMessageInput,
} from '@jovo/shared';
import { PrismaService } from '../prisma.service';
import { canonicalDirectKey } from './chats.utils';

const messageInclude = {
  sender: { include: { profile: true } },
  replyTo: { include: { sender: { include: { profile: true } } } },
  reactions: { select: { emoji: true, userId: true } },
} as const;

@Injectable()
export class ChatsService {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  mapMessage(message: any): MessageDto {
    const reactionMap = new Map<string, string[]>();
    for (const reaction of message.reactions ?? []) {
      const users = reactionMap.get(reaction.emoji) ?? [];
      users.push(reaction.userId);
      reactionMap.set(reaction.emoji, users);
    }
    return {
      id: message.id,
      clientMessageId: message.clientMessageId,
      chatId: message.chatId,
      senderId: message.senderId,
      content: message.deletedAt ? 'Xabar o‘chirildi' : message.content,
      createdAt: message.createdAt.toISOString(),
      editedAt: message.editedAt?.toISOString() ?? null,
      deletedAt: message.deletedAt?.toISOString() ?? null,
      sender: {
        id: message.sender.id,
        username: message.sender.username,
        displayName: message.sender.profile?.displayName ?? message.sender.username,
        avatarUrl: message.sender.profile?.avatarUrl ?? null,
      },
      replyTo: message.replyTo
        ? {
            id: message.replyTo.id,
            content: message.replyTo.deletedAt ? 'Xabar o‘chirildi' : message.replyTo.content,
            sender: {
              id: message.replyTo.sender.id,
              username: message.replyTo.sender.username,
              displayName: message.replyTo.sender.profile?.displayName ?? message.replyTo.sender.username,
              avatarUrl: message.replyTo.sender.profile?.avatarUrl ?? null,
            },
          }
        : null,
      reactions: [...reactionMap.entries()].map(([emoji, userIds]) => ({ emoji, count: userIds.length, userIds })),
    };
  }

  async memberChatIds(userId: string) {
    const memberships = await this.prisma.chatMember.findMany({
      where: { userId, leftAt: null },
      select: { chatId: true },
    });
    return memberships.map((item) => item.chatId);
  }

  async assertMember(chatId: string, userId: string) {
    const member = await this.prisma.chatMember.findUnique({
      where: { chatId_userId: { chatId, userId } },
      include: { chat: true },
    });
    if (!member || member.leftAt || member.chat.deletedAt) {
      throw new ForbiddenException("Bu chatga kirish huquqi yo'q");
    }
    return member;
  }

  async directChatPeer(chatId: string, userId: string) {
    const membership = await this.assertMember(chatId, userId);
    if (membership.chat.type !== 'DIRECT') throw new ForbiddenException('Hozircha faqat bevosita chatlarda qo‘ng‘iroq qilish mumkin');
    const peer = await this.prisma.chatMember.findFirst({
      where: { chatId, userId: { not: userId }, leftAt: null },
      select: { userId: true },
    });
    if (!peer) throw new NotFoundException('Suhbatdosh topilmadi');
    await this.assertNotBlocked(userId, peer.userId);
    return peer.userId;
  }

  private async assertNotBlocked(firstId: string, secondId: string) {
    const block = await this.prisma.userBlock.findFirst({
      where: {
        OR: [
          { ownerId: firstId, blockedId: secondId },
          { ownerId: secondId, blockedId: firstId },
        ],
      },
      select: { id: true },
    });
    if (block) throw new ForbiddenException('Bloklangan foydalanuvchi bilan yozishib bo‘lmaydi');
  }

  async createDirect(userId: string, raw: unknown) {
    const { userId: peerId } = createDirectChatSchema.parse(raw);
    if (peerId === userId) throw new ForbiddenException("O'zingiz bilan bevosita chat ochib bo'lmaydi");
    const peer = await this.prisma.user.findUnique({
      where: { id: peerId },
      include: { privacy: true },
    });
    if (!peer || peer.deletedAt) throw new NotFoundException('Foydalanuvchi topilmadi');
    if (peer.privacy && !peer.privacy.allowDirectMessage) {
      throw new ForbiddenException('Foydalanuvchi yangi bevosita chatlarni cheklagan');
    }
    await this.assertNotBlocked(userId, peerId);
    const directKey = canonicalDirectKey(userId, peerId);
    const chat = await this.prisma.chat.upsert({
      where: { directKey },
      update: {},
      create: {
        type: 'DIRECT',
        directKey,
        members: {
          create: [
            { userId, role: 'MEMBER' },
            { userId: peerId, role: 'MEMBER' },
          ],
        },
      },
    });
    return this.get(chat.id, userId);
  }

  async list(userId: string) {
    const chats = await this.prisma.chat.findMany({
      where: { members: { some: { userId, leftAt: null } }, deletedAt: null },
      include: {
        members: {
          where: { userId: { not: userId }, leftAt: null },
          include: { user: { include: { profile: true } } },
        },
        messages: { where: { deletedAt: null }, orderBy: [{ createdAt: 'desc' }, { id: 'desc' }], take: 1, include: messageInclude },
        readCursors: { where: { userId }, take: 1 },
      },
      orderBy: [{ updatedAt: 'desc' }, { id: 'desc' }],
      take: 100,
    });

    return Promise.all(
      chats.map(async (chat) => {
        const peerMember = chat.members[0];
        const peer = peerMember?.user;
        const cursor = chat.readCursors[0];
        const unreadCount = await this.prisma.message.count({
          where: {
            chatId: chat.id,
            senderId: { not: userId },
            deletedAt: null,
            ...(cursor ? { createdAt: { gt: cursor.readAt } } : {}),
          },
        });
        return {
          id: chat.id,
          title: chat.title ?? peer?.profile?.displayName ?? peer?.username ?? 'Chat',
          avatarUrl: chat.avatarUrl ?? peer?.profile?.avatarUrl ?? null,
          peer: peer
            ? {
                id: peer.id,
                username: peer.username,
                displayName: peer.profile?.displayName ?? peer.username,
                avatarUrl: peer.profile?.avatarUrl ?? null,
              }
            : null,
          lastMessage: chat.messages[0] ? this.mapMessage(chat.messages[0]) : null,
          unreadCount,
          updatedAt: chat.updatedAt.toISOString(),
        };
      }),
    );
  }

  async get(chatId: string, userId: string) {
    await this.assertMember(chatId, userId);
    const chat = await this.prisma.chat.findUnique({
      where: { id: chatId },
      include: {
        members: {
          where: { userId: { not: userId }, leftAt: null },
          include: { user: { include: { profile: true } } },
        },
        drafts: { where: { userId }, take: 1 },
      },
    });
    if (!chat) throw new NotFoundException('Chat topilmadi');
    const peer = chat.members[0]?.user;
    return {
      id: chat.id,
      type: chat.type,
      title: chat.title ?? peer?.profile?.displayName ?? peer?.username ?? 'Chat',
      avatarUrl: chat.avatarUrl ?? peer?.profile?.avatarUrl ?? null,
      peer: peer
        ? {
            id: peer.id,
            username: peer.username,
            displayName: peer.profile?.displayName ?? peer.username,
            avatarUrl: peer.profile?.avatarUrl ?? null,
          }
        : null,
      draft: chat.drafts[0]
        ? { content: chat.drafts[0].content, updatedAt: chat.drafts[0].updatedAt.toISOString() }
        : null,
    };
  }

  async messages(chatId: string, userId: string, cursor?: string, limitRaw?: string) {
    await this.assertMember(chatId, userId);
    const limit = Math.min(Math.max(Number(limitRaw) || 40, 1), 100);
    const rows = await this.prisma.message.findMany({
      where: { chatId, deleteScope: { not: 'FOR_SENDER' } },
      include: messageInclude,
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      take: limit + 1,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
    });
    const hasMore = rows.length > limit;
    const page = rows.slice(0, limit);
    return {
      items: page.reverse().map((message) => this.mapMessage(message)),
      nextCursor: hasMore ? page.at(-1)?.id ?? null : null,
    };
  }

  async send(userId: string, chatId: string, raw: SendMessageInput) {
    const input = sendMessageSchema.parse(raw);
    const membership = await this.assertMember(chatId, userId);
    if (membership.chat.type === 'DIRECT') {
      const peer = await this.prisma.chatMember.findFirst({
        where: { chatId, userId: { not: userId }, leftAt: null },
        select: { userId: true },
      });
      if (peer) await this.assertNotBlocked(userId, peer.userId);
    }
    if (input.replyToId) {
      const reply = await this.prisma.message.findFirst({ where: { id: input.replyToId, chatId } });
      if (!reply) throw new NotFoundException('Javob berilayotgan xabar topilmadi');
    }
    try {
      const message = await this.prisma.$transaction(async (tx) => {
        const created = await tx.message.create({
          data: {
            chatId,
            senderId: userId,
            clientMessageId: input.clientMessageId,
            content: input.content,
            replyToId: input.replyToId ?? null,
          },
          include: messageInclude,
        });
        await tx.chat.update({ where: { id: chatId }, data: { updatedAt: new Date() } });
        return created;
      });
      return this.mapMessage(message);
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        const existing = await this.prisma.message.findUnique({
          where: { senderId_clientMessageId: { senderId: userId, clientMessageId: input.clientMessageId } },
          include: messageInclude,
        });
        if (existing) return this.mapMessage(existing);
      }
      throw error;
    }
  }

  async edit(userId: string, messageId: string, raw: unknown) {
    const { content } = editMessageSchema.parse(raw);
    const existing = await this.prisma.message.findUnique({ where: { id: messageId } });
    if (!existing) throw new NotFoundException('Xabar topilmadi');
    await this.assertMember(existing.chatId, userId);
    if (existing.senderId !== userId) throw new ForbiddenException('Faqat o‘zingiz yuborgan xabarni tahrirlashingiz mumkin');
    if (existing.deletedAt) throw new ForbiddenException('O‘chirilgan xabarni tahrirlab bo‘lmaydi');
    const message = await this.prisma.message.update({
      where: { id: messageId },
      data: { content, editedAt: new Date() },
      include: messageInclude,
    });
    return this.mapMessage(message);
  }

  async deleteForEveryone(userId: string, messageId: string) {
    const existing = await this.prisma.message.findUnique({ where: { id: messageId } });
    if (!existing) throw new NotFoundException('Xabar topilmadi');
    await this.assertMember(existing.chatId, userId);
    if (existing.senderId !== userId) throw new ForbiddenException('Faqat o‘zingiz yuborgan xabarni o‘chirishingiz mumkin');
    const message = await this.prisma.message.update({
      where: { id: messageId },
      data: { content: '', deletedAt: existing.deletedAt ?? new Date(), deleteScope: 'FOR_EVERYONE' },
      include: messageInclude,
    });
    return this.mapMessage(message);
  }

  async addReaction(userId: string, messageId: string, raw: unknown) {
    const { emoji } = messageReactionSchema.parse(raw);
    const existing = await this.prisma.message.findUnique({ where: { id: messageId } });
    if (!existing || existing.deletedAt) throw new NotFoundException('Xabar topilmadi');
    await this.assertMember(existing.chatId, userId);
    await this.prisma.messageReaction.upsert({
      where: { messageId_userId_emoji: { messageId, userId, emoji } },
      create: { messageId, userId, emoji },
      update: {},
    });
    return this.getMessage(messageId);
  }

  async removeReaction(userId: string, messageId: string, emojiRaw: string) {
    const { emoji } = messageReactionSchema.parse({ emoji: emojiRaw });
    const existing = await this.prisma.message.findUnique({ where: { id: messageId } });
    if (!existing) throw new NotFoundException('Xabar topilmadi');
    await this.assertMember(existing.chatId, userId);
    await this.prisma.messageReaction.deleteMany({ where: { messageId, userId, emoji } });
    return this.getMessage(messageId);
  }

  private async getMessage(messageId: string) {
    const message = await this.prisma.message.findUnique({ where: { id: messageId }, include: messageInclude });
    if (!message) throw new NotFoundException('Xabar topilmadi');
    return this.mapMessage(message);
  }

  async markRead(userId: string, chatId: string, raw: unknown) {
    const { messageId } = markReadSchema.parse(raw);
    await this.assertMember(chatId, userId);
    const message = await this.prisma.message.findFirst({ where: { id: messageId, chatId } });
    if (!message) throw new NotFoundException('Xabar topilmadi');
    await this.prisma.$transaction([
      this.prisma.chatReadCursor.upsert({
        where: { chatId_userId: { chatId, userId } },
        update: { lastMessageId: messageId, readAt: new Date() },
        create: { chatId, userId, lastMessageId: messageId },
      }),
      this.prisma.messageReadReceipt.upsert({
        where: { messageId_userId: { messageId, userId } },
        update: { readAt: new Date() },
        create: { messageId, userId },
      }),
    ]);
    return { chatId, userId, messageId, readAt: new Date().toISOString() };
  }

  async saveDraft(userId: string, chatId: string, content: string) {
    await this.assertMember(chatId, userId);
    if (!content.trim()) {
      await this.prisma.chatDraft.deleteMany({ where: { chatId, userId } });
      return { content: '' };
    }
    const draft = await this.prisma.chatDraft.upsert({
      where: { chatId_userId: { chatId, userId } },
      create: { chatId, userId, content: content.slice(0, 4096) },
      update: { content: content.slice(0, 4096) },
    });
    return { content: draft.content, updatedAt: draft.updatedAt.toISOString() };
  }
}
