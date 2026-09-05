import { Module } from '@nestjs/common';
import { ColumnsController } from './columns.controller.js';
import { ColumnsService } from './columns.service.js';

@Module({
  controllers: [ColumnsController],
  providers: [ColumnsService]
})
export class ColumnsModule {}
