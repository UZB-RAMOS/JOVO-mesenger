import { Body, Controller, Delete, Get, Inject, Param, Patch, Post, Query, Req, UseGuards } from '@nestjs/common';
import type { Request } from 'express';
import { AuthGuard } from '../auth/auth.guard';
import { UsersService } from './users.service';

@Controller('api')
@UseGuards(AuthGuard)
export class UsersController {
  constructor(@Inject(UsersService) private readonly users: UsersService) {}

  @Get('me')
  me(@Req() request: Request) {
    return this.users.me(request.auth!.userId);
  }

  @Patch('me')
  update(@Req() request: Request, @Body() body: unknown) {
    return this.users.update(request.auth!.userId, body);
  }

  @Get('users')
  search(@Req() request: Request, @Query('search') search = '') {
    return this.users.search(request.auth!.userId, search);
  }

  @Get('users/by-username/:username')
  byUsername(@Req() request: Request, @Param('username') username: string) {
    return this.users.byUsername(request.auth!.userId, username);
  }

  @Post('blocks')
  block(@Req() request: Request, @Body('userId') userId: string) {
    return this.users.block(request.auth!.userId, userId);
  }

  @Delete('blocks/:id')
  unblock(@Req() request: Request, @Param('id') id: string) {
    return this.users.unblock(request.auth!.userId, id);
  }
}
