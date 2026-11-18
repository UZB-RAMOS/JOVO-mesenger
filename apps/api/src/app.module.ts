import { Module } from '@nestjs/common';
import { AuthModule } from './auth/auth.module';
import { ChatsModule } from './chats/chats.module';
import { DatabaseModule } from './database.module';
import { HealthController } from './health.controller';
import { UsersModule } from './users/users.module';

@Module({
  imports: [
    DatabaseModule,
    AuthModule,
    UsersModule,
    ChatsModule,
  ],
  controllers: [HealthController],
})
export class AppModule {}
