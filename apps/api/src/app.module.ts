import { Module } from '@nestjs/common';
import { AuthModule } from './auth/auth.module';
import { ChatsModule } from './chats/chats.module';
import { DatabaseModule } from './database.module';
import { HealthController } from './health.controller';
import { StorageModule } from './storage/storage.module';
import { UploadsModule } from './uploads/uploads.module';
import { UsersModule } from './users/users.module';

@Module({
  imports: [
    DatabaseModule,
    StorageModule,
    AuthModule,
    UsersModule,
    ChatsModule,
    UploadsModule,
  ],
  controllers: [HealthController],
})
export class AppModule {}
