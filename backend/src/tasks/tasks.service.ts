import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { CreateTaskDto, UpdateTaskDto, MoveTaskDto } from './dto/task.dto.js';
import { BoardGateway } from '../ws/board/board.gateway.js';

@Injectable()
export class TasksService {
  constructor(
    private prisma: PrismaService,
    private boardGateway: BoardGateway,
  ) {}

  async create(columnId: string, dto: CreateTaskDto) {
    const column = await this.prisma.column.findUnique({ where: { id: columnId } });
    if (!column) throw new NotFoundException('Column not found');

    const lastTask = await this.prisma.task.findFirst({
      where: { columnId },
      orderBy: { position: 'desc' },
    });

    const position = lastTask ? lastTask.position + 1.0 : 1.0;

    const task = await this.prisma.task.create({
      data: {
        title: dto.title,
        description: dto.description || '',
        columnId,
        boardId: column.boardId,
        position,
      },
    });
    this.boardGateway.broadcastToBoard(column.boardId, 'task:created', task);
    return task;
  }

  async findOne(id: string) {
    const task = await this.prisma.task.findUnique({ where: { id } });
    if (!task) throw new NotFoundException('Task not found');
    return task;
  }

  async update(id: string, dto: UpdateTaskDto) {
    const task = await this.prisma.task.update({
      where: { id },
      data: {
        title: dto.title,
        description: dto.description,
      },
    });
    this.boardGateway.broadcastToBoard(task.boardId, 'task:updated', task);
    return task;
  }

  async remove(id: string) {
    const task = await this.prisma.task.delete({
      where: { id },
    });
    this.boardGateway.broadcastToBoard(task.boardId, 'task:deleted', { taskId: id, columnId: task.columnId });
    return task;
  }

  // Fractional indexing task movement
  async move(id: string, dto: MoveTaskDto) {
    return this.prisma.$transaction(async (tx) => {
      const task = await tx.task.findUnique({ where: { id } });
      if (!task) throw new NotFoundException('Task not found');

      // Fetch all tasks in the target column ordered by position
      const targetTasks = await tx.task.findMany({
        where: { columnId: dto.targetColumnId, id: { not: id } },
        orderBy: { position: 'asc' },
      });

      let newPosition: number;
      const targetIndex = dto.position;

      if (targetTasks.length === 0) {
        newPosition = 1.0;
      } else if (targetIndex <= 0) {
        newPosition = targetTasks[0].position / 2;
      } else if (targetIndex >= targetTasks.length) {
        newPosition = targetTasks[targetTasks.length - 1].position + 1.0;
      } else {
        const prev = targetTasks[targetIndex - 1];
        const next = targetTasks[targetIndex];
        newPosition = (prev.position + next.position) / 2;
      }

      const updatedTask = await tx.task.update({
        where: { id },
        data: {
          columnId: dto.targetColumnId,
          position: newPosition,
        },
      });

      // Simple re-balancing check (prevent precision loss)
      // Real app might enqueue a background job here.
      if (
        targetIndex > 0 &&
        targetIndex < targetTasks.length &&
        targetTasks[targetIndex].position - targetTasks[targetIndex - 1].position < 0.0001
      ) {
        // Trigger a rebalance
        const allTargetTasks = await tx.task.findMany({
          where: { columnId: dto.targetColumnId },
          orderBy: { position: 'asc' },
        });
        for (let i = 0; i < allTargetTasks.length; i++) {
          await tx.task.update({
            where: { id: allTargetTasks[i].id },
            data: { position: (i + 1) * 1.0 },
          });
        }
        // return updated task with new balanced position
        return tx.task.findUnique({ where: { id } });
      }

      const resultTask = await tx.task.findUnique({ where: { id } });
      this.boardGateway.broadcastToBoard(task.boardId, 'task:moved', {
        taskId: id,
        fromColumnId: task.columnId,
        toColumnId: dto.targetColumnId,
        position: resultTask!.position
      });
      return resultTask;
    });
  }
}
