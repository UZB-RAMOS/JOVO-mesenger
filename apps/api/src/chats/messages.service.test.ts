import { ForbiddenException } from '@nestjs/common';
import { describe, expect, it, vi } from 'vitest';
import { ChatsService } from './chats.service';

function createService(senderId = 'alice-id') {
  const now = new Date('2026-11-13T10:00:00.000Z');
  const existing = {
    id: 'message-id',
    chatId: 'chat-id',
    senderId,
    deletedAt: null,
  };
  const prisma = {
    message: {
      findUnique: vi.fn().mockResolvedValue(existing),
      update: vi.fn().mockResolvedValue({
        ...existing,
        clientMessageId: 'client-id',
        content: 'Yangilangan xabar',
        createdAt: now,
        editedAt: now,
        sender: { id: senderId, username: 'alice', profile: { displayName: 'Alice', avatarUrl: null } },
        replyTo: null,
        reactions: [],
      }),
    },
    chatMember: {
      findUnique: vi.fn().mockResolvedValue({ leftAt: null, chat: { deletedAt: null } }),
    },
  };
  return { service: new ChatsService(prisma as never), prisma };
}

describe('message mutations', () => {
  it('rejects editing another user’s message', async () => {
    const { service, prisma } = createService('alice-id');
    await expect(service.edit('bob-id', 'message-id', { content: 'Nojoiz tahrir' })).rejects.toBeInstanceOf(ForbiddenException);
    expect(prisma.message.update).not.toHaveBeenCalled();
  });

  it('edits the sender’s message and returns the safe DTO', async () => {
    const { service, prisma } = createService('alice-id');
    const result = await service.edit('alice-id', 'message-id', { content: 'Yangilangan xabar' });
    expect(prisma.message.update).toHaveBeenCalledOnce();
    expect(result.content).toBe('Yangilangan xabar');
    expect(result.editedAt).toBe('2026-11-13T10:00:00.000Z');
  });

  it('deletes the sender’s message for everyone without retaining its body', async () => {
    const { service, prisma } = createService('alice-id');
    await service.deleteForEveryone('alice-id', 'message-id');
    expect(prisma.message.update).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ content: '', deleteScope: 'FOR_EVERYONE' }),
    }));
  });
});
