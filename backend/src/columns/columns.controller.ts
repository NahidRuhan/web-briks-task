import { Controller, Post, Body, Patch, Param, Delete, UseGuards } from '@nestjs/common';
import { ColumnsService } from './columns.service.js';
import { CreateColumnDto, UpdateColumnDto, ReorderColumnDto } from './dto/column.dto.js';
import { BoardAccessGuard } from '../common/guards/board-access.guard.js';

@UseGuards(BoardAccessGuard)
@Controller('api')
export class ColumnsController {
  constructor(private readonly columnsService: ColumnsService) {}

  @Post('boards/:boardId/columns')
  create(@Param('boardId') boardId: string, @Body() createColumnDto: CreateColumnDto) {
    return this.columnsService.create(boardId, createColumnDto);
  }

  @Patch('columns/:id')
  update(@Param('id') id: string, @Body() updateColumnDto: UpdateColumnDto) {
    return this.columnsService.update(id, updateColumnDto);
  }

  @Patch('columns/:id/reorder')
  reorder(@Param('id') id: string, @Body() dto: ReorderColumnDto) {
    return this.columnsService.reorder(id, dto);
  }

  @Delete('columns/:id')
  remove(@Param('id') id: string) {
    return this.columnsService.remove(id);
  }
}
