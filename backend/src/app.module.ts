import { Module } from '@nestjs/common';
import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';
import { UsersModule } from './users/users.module.js';
import { AuthModule } from './auth/auth.module.js';
import { BoardsModule } from './boards/boards.module.js';
import { ColumnsModule } from './columns/columns.module.js';
import { TasksModule } from './tasks/tasks.module.js';
import { WsModule } from './ws/ws.module.js';

@Module({
  imports: [UsersModule, AuthModule, BoardsModule, ColumnsModule, TasksModule, WsModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
