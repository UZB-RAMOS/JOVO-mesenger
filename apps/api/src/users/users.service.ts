import { ConflictException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { z } from 'zod';
import type { Prisma } from '../generated/prisma/client';
import { PrismaService } from '../prisma.service';

const profileUpdateSchema = z.object({
  displayName: z.string().trim().min(2).max(64).optional(),
  bio: z.string().trim().max(160).nullable().optional(),
  avatarUrl: z.url().max(2048).nullable().optional(),
});

@Injectable()
export class UsersService {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  private select() {
    return {
      id: true,
      username: true,
      profile: { select: { displayName: true, avatarUrl: true, bio: true } },
    } as const;
  }

  map(user: any) {
    return {
      id: user.id,
      username: user.username,
      displayName: user.profile?.displayName ?? user.username,
      avatarUrl: user.profile?.avatarUrl ?? null,
      bio: user.profile?.bio ?? null,
    };
  }

  async me(userId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId }, select: this.select() });
    if (!user) throw new NotFoundException('Foydalanuvchi topilmadi');
    return this.map(user);
  }

  async update(userId: string, raw: unknown) {
    const input = profileUpdateSchema.parse(raw);
    const data: Prisma.UserProfileUpdateInput = {};
    if (input.displayName !== undefined) data.displayName = input.displayName;
    if (input.bio !== undefined) data.bio = input.bio;
    if (input.avatarUrl !== undefined) data.avatarUrl = input.avatarUrl;
    const user = await this.prisma.user.update({
      where: { id: userId },
      data: { profile: { update: data } },
      select: this.select(),
    });
    return this.map(user);
  }

  async byUsername(requesterId: string, username: string) {
    const user = await this.prisma.user.findUnique({
      where: { username: username.toLowerCase() },
      select: this.select(),
    });
    if (!user) throw new NotFoundException('Foydalanuvchi topilmadi');
    await this.assertVisible(requesterId, user.id);
    return this.map(user);
  }

  async search(requesterId: string, query: string) {
    const normalized = query.trim().replace(/^@/, '').toLowerCase();
    if (normalized.length < 2) return [];
    const blocked = await this.prisma.userBlock.findMany({
      where: { OR: [{ ownerId: requesterId }, { blockedId: requesterId }] },
      select: { ownerId: true, blockedId: true },
    });
    const excluded = new Set(blocked.flatMap((item) => [item.ownerId, item.blockedId]));
    excluded.add(requesterId);
    const users = await this.prisma.user.findMany({
      where: {
        id: { notIn: [...excluded] },
        deletedAt: null,
        OR: [
          { username: { contains: normalized, mode: 'insensitive' } },
          { profile: { displayName: { contains: query.trim(), mode: 'insensitive' } } },
        ],
      },
      select: this.select(),
      take: 20,
      orderBy: { username: 'asc' },
    });
    return users.map((user) => this.map(user));
  }

  private async assertVisible(requesterId: string, targetId: string) {
    const block = await this.prisma.userBlock.findFirst({
      where: {
        OR: [
          { ownerId: requesterId, blockedId: targetId },
          { ownerId: targetId, blockedId: requesterId },
        ],
      },
    });
    if (block) throw new NotFoundException('Foydalanuvchi topilmadi');
  }

  async block(userId: string, blockedId: string) {
    if (userId === blockedId) throw new ConflictException("O'zingizni bloklab bo'lmaydi");
    await this.prisma.user.findUniqueOrThrow({ where: { id: blockedId } });
    await this.prisma.userBlock.upsert({
      where: { ownerId_blockedId: { ownerId: userId, blockedId } },
      create: { ownerId: userId, blockedId },
      update: {},
    });
    return { message: 'Foydalanuvchi bloklandi' };
  }

  async unblock(userId: string, blockedId: string) {
    await this.prisma.userBlock.deleteMany({ where: { ownerId: userId, blockedId } });
    return { message: 'Blokdan chiqarildi' };
  }
}
