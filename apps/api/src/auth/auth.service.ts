import {
  BadRequestException,
  ConflictException,
  HttpException,
  HttpStatus,
  Inject,
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { hash, verify } from 'argon2';
import { createHash, randomBytes, randomInt } from 'node:crypto';
import { loginSchema, registerSchema, verifySchema, type LoginInput, type RegisterInput } from '@jovo/shared';
import { PrismaService } from '../prisma.service';

@Injectable()
export class AuthService {
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(JwtService) private readonly jwt: JwtService,
  ) {}

  private tokenHash(token: string) {
    return createHash('sha256').update(token).digest('hex');
  }

  private mapUser(user: any) {
    return {
      id: user.id,
      username: user.username,
      displayName: user.profile?.displayName ?? user.username,
      avatarUrl: user.profile?.avatarUrl ?? null,
      bio: user.profile?.bio ?? null,
    };
  }

  async register(raw: RegisterInput) {
    const input = registerSchema.parse(raw);
    if (process.env.NODE_ENV === 'production' && process.env.OTP_EMAIL_PROVIDER_ENABLED !== 'true') {
      throw new ServiceUnavailableException('Production email provider konfiguratsiya qilinmagan');
    }
    const recentChallenges = await this.prisma.verificationChallenge.count({
      where: {
        identity: input.email,
        purpose: 'REGISTER',
        createdAt: { gt: new Date(Date.now() - 60 * 60 * 1000) },
      },
    });
    if (recentChallenges >= 5) {
      throw new HttpException('Juda ko‘p urinish. Bir soatdan keyin qayta urinib ko‘ring', HttpStatus.TOO_MANY_REQUESTS);
    }
    const duplicate = await this.prisma.user.findFirst({
      where: {
        OR: [{ username: input.username }, { identities: { some: { type: 'EMAIL', value: input.email } } }],
      },
      select: { id: true },
    });
    if (duplicate) throw new ConflictException('Email yoki username allaqachon band');

    const code = randomInt(100000, 1000000).toString();
    const [passwordHash, codeHash] = await Promise.all([hash(input.password), hash(code)]);
    await this.prisma.$transaction(async (tx) => {
      await tx.user.create({
        data: {
          username: input.username,
          profile: { create: { displayName: input.displayName } },
          preferences: { create: {} },
          privacy: { create: {} },
          status: { create: {} },
          identities: { create: { type: 'EMAIL', value: input.email } },
          password: { create: { passwordHash } },
        },
      });
      await tx.verificationChallenge.create({
        data: {
          identity: input.email,
          purpose: 'REGISTER',
          codeHash,
          expiresAt: new Date(Date.now() + 10 * 60 * 1000),
        },
      });
    });

    return {
      message: "Tasdiqlash kodi yuborildi",
      ...(process.env.NODE_ENV !== 'production' && process.env.DEV_SHOW_VERIFICATION_CODE === 'true'
        ? { devVerificationCode: code }
        : {}),
    };
  }

  async verify(raw: unknown) {
    const input = verifySchema.parse(raw);
    const challenge = await this.prisma.verificationChallenge.findFirst({
      where: {
        identity: input.email,
        purpose: 'REGISTER',
        consumedAt: null,
        expiresAt: { gt: new Date() },
      },
      orderBy: { createdAt: 'desc' },
    });
    if (!challenge) throw new NotFoundException('Faol tasdiqlash kodi topilmadi');
    if (challenge.attempts >= 5) throw new BadRequestException('Urinishlar soni tugadi');
    if (!(await verify(challenge.codeHash, input.code))) {
      await this.prisma.verificationChallenge.update({
        where: { id: challenge.id },
        data: { attempts: { increment: 1 } },
      });
      throw new BadRequestException("Tasdiqlash kodi noto'g'ri");
    }
    await this.prisma.$transaction([
      this.prisma.verificationChallenge.update({
        where: { id: challenge.id },
        data: { consumedAt: new Date() },
      }),
      this.prisma.authIdentity.update({
        where: { type_value: { type: 'EMAIL', value: input.email } },
        data: { verifiedAt: new Date() },
      }),
    ]);
    return { message: 'Hisob tasdiqlandi' };
  }

  async login(raw: LoginInput, meta: { userAgent: string | undefined; ip: string | undefined }) {
    const input = loginSchema.parse(raw);
    const identity = await this.prisma.authIdentity.findUnique({
      where: { type_value: { type: 'EMAIL', value: input.email } },
      include: {
        user: { include: { password: true, profile: true } },
      },
    });
    if (!identity?.verifiedAt || !identity.user.password) {
      throw new UnauthorizedException("Email yoki parol noto'g'ri");
    }
    if (!(await verify(identity.user.password.passwordHash, input.password))) {
      throw new UnauthorizedException("Email yoki parol noto'g'ri");
    }
    return this.createSession(identity.user, meta);
  }

  private async createSession(
    user: { id: string; username: string; profile?: { displayName: string; avatarUrl: string | null; bio: string | null } | null },
    meta: { userAgent: string | undefined; ip: string | undefined },
  ) {
    const refreshToken = randomBytes(48).toString('base64url');
    const days = Number(process.env.REFRESH_TOKEN_DAYS ?? 30);
    const secret = process.env.JWT_ACCESS_SECRET;
    if (!secret) throw new Error('JWT_ACCESS_SECRET majburiy');
    const session = await this.prisma.session.create({
      data: {
        userId: user.id,
        refreshTokenHash: this.tokenHash(refreshToken),
        ...(meta.userAgent ? { userAgent: meta.userAgent.slice(0, 512) } : {}),
        ...(meta.ip ? { ipHash: this.tokenHash(meta.ip) } : {}),
        expiresAt: new Date(Date.now() + days * 86400000),
      },
    });
    const accessToken = await this.jwt.signAsync(
      { sub: user.id, sid: session.id },
      {
        secret,
        expiresIn: (process.env.JWT_ACCESS_TTL ?? '15m') as any,
      },
    );
    return { accessToken, refreshToken, user: this.mapUser(user) };
  }

  async refresh(refreshToken: string | undefined) {
    if (!refreshToken) throw new UnauthorizedException('Refresh token topilmadi');
    const session = await this.prisma.session.findUnique({
      where: { refreshTokenHash: this.tokenHash(refreshToken) },
      include: { user: { include: { profile: true } } },
    });
    if (!session || session.revokedAt || session.expiresAt <= new Date()) {
      throw new UnauthorizedException('Refresh sessiyasi yaroqsiz');
    }
    const next = randomBytes(48).toString('base64url');
    const secret = process.env.JWT_ACCESS_SECRET;
    if (!secret) throw new Error('JWT_ACCESS_SECRET majburiy');
    await this.prisma.session.update({
      where: { id: session.id },
      data: { refreshTokenHash: this.tokenHash(next), lastUsedAt: new Date() },
    });
    const accessToken = await this.jwt.signAsync(
      { sub: session.userId, sid: session.id },
      { secret, expiresIn: (process.env.JWT_ACCESS_TTL ?? '15m') as any },
    );
    return { accessToken, refreshToken: next, user: this.mapUser(session.user) };
  }

  async logout(sessionId: string) {
    await this.prisma.session.updateMany({
      where: { id: sessionId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
    return { message: 'Sessiya yakunlandi' };
  }

  async sessions(userId: string) {
    return this.prisma.session.findMany({
      where: { userId },
      select: { id: true, userAgent: true, createdAt: true, lastUsedAt: true, expiresAt: true, revokedAt: true },
      orderBy: { lastUsedAt: 'desc' },
    });
  }

  async revokeSession(userId: string, sessionId: string) {
    const result = await this.prisma.session.updateMany({
      where: { id: sessionId, userId },
      data: { revokedAt: new Date() },
    });
    if (!result.count) throw new NotFoundException('Sessiya topilmadi');
    return { message: 'Sessiya bekor qilindi' };
  }
}
