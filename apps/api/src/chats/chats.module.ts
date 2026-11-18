import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { ChatGateway } from './chat.gateway';
import { ChatsController } from './chats.controller';
import { ChatsService } from './chats.service';
import { MessagesController } from './messages.controller';

@Module({
  imports: [AuthModule],
  controllers: [ChatsController, MessagesController],
  providers: [ChatsService, ChatGateway],
  exports: [ChatsService],
})
export class ChatsModule {}
