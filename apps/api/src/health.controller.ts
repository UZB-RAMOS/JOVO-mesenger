import { Controller, Get, Inject, ServiceUnavailableException } from '@nestjs/common';
import { PrismaService } from './prisma.service';

@Controller('api/health')
export class HealthController {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  @Get('live')
  live() {
    return { status: 'ok', service: 'jovo-api', time: new Date().toISOString() };
  }

  @Get('ready')
  async ready() {
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      return { status: 'ready', database: 'connected' };
    } catch {
      throw new ServiceUnavailableException({ status: 'not-ready', database: 'unavailable' });
    }
  }
}
