import { CanActivate, ExecutionContext, Inject, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma.service';
import type { AuthUser } from './auth.types';

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(
    @Inject(JwtService) private readonly jwt: JwtService,
    @Inject(PrismaService) private readonly prisma: PrismaService,
  ) {}

  async authenticateToken(token: string | undefined): Promise<AuthUser> {
    if (!token) throw new UnauthorizedException('Kirish talab qilinadi');
    const secret = process.env.JWT_ACCESS_SECRET;
    if (!secret) throw new UnauthorizedException('Server autentifikatsiyasi sozlanmagan');
    try {
      const payload = await this.jwt.verifyAsync<{ sub: string; sid: string }>(token, {
        secret,
      });
      const session = await this.prisma.session.findFirst({
        where: {
          id: payload.sid,
          userId: payload.sub,
          revokedAt: null,
          expiresAt: { gt: new Date() },
        },
        select: { id: true },
      });
      if (!session) throw new Error('session revoked');
      return { userId: payload.sub, sessionId: payload.sid };
    } catch {
      throw new UnauthorizedException('Sessiya yaroqsiz yoki muddati tugagan');
    }
  }

  async canActivate(context: ExecutionContext) {
    const request = context.switchToHttp().getRequest();
    const header = request.headers.authorization as string | undefined;
    request.auth = await this.authenticateToken(header?.startsWith('Bearer ') ? header.slice(7) : undefined);
    return true;
  }
}
