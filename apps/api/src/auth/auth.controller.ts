import { Body, Controller, Delete, Get, Inject, Param, Post, Req, Res, UseGuards } from '@nestjs/common';
import type { Request, Response } from 'express';
import type { LoginInput, RegisterInput } from '@jovo/shared';
import { AuthGuard } from './auth.guard';
import { AuthService } from './auth.service';

@Controller('api/auth')
export class AuthController {
  constructor(@Inject(AuthService) private readonly auth: AuthService) {}

  private setRefreshCookie(response: Response, token: string) {
    response.cookie('jovo_refresh', token, {
      httpOnly: true,
      secure: process.env.COOKIE_SECURE === 'true',
      sameSite: 'lax',
      path: '/api/auth',
      maxAge: Number(process.env.REFRESH_TOKEN_DAYS ?? 30) * 86400000,
    });
  }

  @Post('register')
  register(@Body() body: RegisterInput) {
    return this.auth.register(body);
  }

  @Post('verify')
  verify(@Body() body: unknown) {
    return this.auth.verify(body);
  }

  @Post('login')
  async login(@Body() body: LoginInput, @Req() request: Request, @Res({ passthrough: true }) response: Response) {
    const result = await this.auth.login(body, {
      userAgent: request.headers['user-agent'],
      ip: request.ip,
    });
    this.setRefreshCookie(response, result.refreshToken);
    return { accessToken: result.accessToken, user: result.user };
  }

  @Post('phone/register')
  phoneRegister(@Body() body: unknown) {
    return this.auth.phoneRegister(body);
  }

  @Post('phone/request-code')
  phoneRequestCode(@Body() body: unknown) {
    return this.auth.phoneRequestCode(body);
  }

  @Post('phone/verify')
  async phoneVerify(@Body() body: unknown, @Req() request: Request, @Res({ passthrough: true }) response: Response) {
    const result = await this.auth.phoneVerify(body, {
      userAgent: request.headers['user-agent'],
      ip: request.ip,
    });
    this.setRefreshCookie(response, result.refreshToken);
    return { accessToken: result.accessToken, user: result.user };
  }

  @Post('refresh')
  async refresh(@Req() request: Request, @Res({ passthrough: true }) response: Response) {
    const result = await this.auth.refresh(request.cookies?.jovo_refresh);
    this.setRefreshCookie(response, result.refreshToken);
    return { accessToken: result.accessToken, user: result.user };
  }

  @Post('logout')
  @UseGuards(AuthGuard)
  async logout(@Req() request: Request, @Res({ passthrough: true }) response: Response) {
    response.clearCookie('jovo_refresh', { path: '/api/auth' });
    return this.auth.logout(request.auth!.sessionId);
  }

  @Get('sessions')
  @UseGuards(AuthGuard)
  sessions(@Req() request: Request) {
    return this.auth.sessions(request.auth!.userId);
  }

  @Delete('sessions/:id')
  @UseGuards(AuthGuard)
  revoke(@Req() request: Request, @Param('id') id: string) {
    return this.auth.revokeSession(request.auth!.userId, id);
  }
}
