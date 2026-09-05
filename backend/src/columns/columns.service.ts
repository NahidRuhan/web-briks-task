import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { CreateColumnDto, UpdateColumnDto, ReorderColumnDto } from './dto/column.dto.js';
import { BoardGateway } from '../ws/board/board.gateway.js';

@Injectable()
export class ColumnsService {
  constructor(
    private prisma: PrismaService,
    private boardGateway: BoardGateway,
  ) {}

  async create(boardId: string, dto: CreateColumnDto) {
    // Find highest position
    const lastColumn = await this.prisma.column.findFirst({
      where: { boardId },
      orderBy: { position: 'desc' },
    });

    const position = lastColumn ? lastColumn.position + 1.0 : 1.0;

    const column = await this.prisma.column.create({
      data: {
        title: dto.title,
        boardId,
        position,
      },
    });
    this.boardGateway.broadcastToBoard(boardId, 'column:created', column);
    return column;
  }

  async update(id: string, dto: UpdateColumnDto) {
    const column = await this.prisma.column.update({
      where: { id },
      data: { title: dto.title },
    });
    this.boardGateway.broadcastToBoard(column.boardId, 'column:updated', column);
    return column;
  }

  async reorder(id: string, dto: ReorderColumnDto) {
    // Basic fractional index update
    const column = await this.prisma.column.update({
      where: { id },
      data: { position: dto.position },
    });
    this.boardGateway.broadcastToBoard(column.boardId, 'column:reordered', column);
    return column;
  }

  async remove(id: string) {
    const column = await this.prisma.column.delete({
      where: { id },
    });
    this.boardGateway.broadcastToBoard(column.boardId, 'column:deleted', { columnId: id });
    return column;
  }
}

