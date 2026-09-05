import { CanActivate, ExecutionContext, Injectable, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service.js';
import { Reflector } from '@nestjs/core';

@Injectable()
export class BoardAccessGuard implements CanActivate {
  constructor(private prisma: PrismaService, private reflector: Reflector) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const user = request.user;
    if (!user) return false;

    let boardId = request.params.boardId;
    const route = request.route.path;
    const id = request.params.id;

    if (!boardId && id) {
      if (route.includes('/tasks/')) {
        const task = await this.prisma.task.findUnique({ where: { id }, select: { boardId: true } });
        if (task) boardId = task.boardId;
      } else if (route.includes('/columns/')) {
        const column = await this.prisma.column.findUnique({ where: { id }, select: { boardId: true } });
        if (column) boardId = column.boardId;
      } else if (route.includes('/boards/')) {
        boardId = id;
      }
    }

    if (!boardId) {
      const columnId = request.params.columnId;
      if (columnId) {
        const column = await this.prisma.column.findUnique({ where: { id: columnId }, select: { boardId: true } });
        if (column) boardId = column.boardId;
      }
    }

    if (!boardId) return true;

    const board = await this.prisma.board.findUnique({
      where: { id: boardId },
      include: { members: true },
    });

    if (!board) {
      return false;
    }

    if (board.ownerId === user.userId) {
      return true;
    }

    const isMember = board.members.some(member => member.userId === user.userId);
    if (!isMember) {
      throw new ForbiddenException('You do not have access to this board');
    }

    return true;
  }
}
