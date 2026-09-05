import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { CreateBoardDto, UpdateBoardDto } from './dto/board.dto.js';
import { BoardGateway } from '../ws/board/board.gateway.js';

@Injectable()
export class BoardsService {
  constructor(
    private prisma: PrismaService,
    private boardGateway: BoardGateway,
  ) {}

  async create(userId: string, dto: CreateBoardDto) {
    return this.prisma.board.create({
      data: {
        title: dto.title,
        ownerId: userId,
      },
    });
  }

  async findAll(userId: string) {
    return this.prisma.board.findMany({
      where: {
        OR: [
          { ownerId: userId },
          { members: { some: { userId } } },
        ],
      },
      include: {
        owner: { select: { id: true, name: true, email: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(boardId: string) {
    const board = await this.prisma.board.findUnique({
      where: { id: boardId },
      include: {
        columns: {
          include: {
            tasks: {
              orderBy: { position: 'asc' },
            },
          },
          orderBy: { position: 'asc' },
        },
        members: {
          include: {
            user: { select: { id: true, name: true, email: true } },
          },
        },
        owner: { select: { id: true, name: true, email: true } },
      },
    });

    if (!board) throw new NotFoundException('Board not found');
    return board;
  }

  async update(boardId: string, dto: UpdateBoardDto) {
    const board = await this.prisma.board.update({
      where: { id: boardId },
      data: { title: dto.title },
    });
    this.boardGateway.broadcastToBoard(boardId, 'board:updated', board);
    return board;
  }

  async remove(userId: string, boardId: string) {
    const board = await this.prisma.board.findUnique({ where: { id: boardId } });
    if (!board) throw new NotFoundException('Board not found');
    
    // Only owner can delete board
    if (board.ownerId !== userId) {
      throw new ForbiddenException('Only the board owner can delete it');
    }

    return this.prisma.board.delete({
      where: { id: boardId },
    });
  }

  async getMembers(boardId: string) {
    const board = await this.prisma.board.findUnique({
      where: { id: boardId },
      include: {
        owner: { select: { id: true, name: true, email: true } },
        members: {
          include: {
            user: { select: { id: true, name: true, email: true } },
          },
        },
      },
    });
    if (!board) throw new NotFoundException('Board not found');
    return {
      owner: board.owner,
      members: board.members,
    };
  }

  async addMember(userId: string, boardId: string, email: string) {
    const board = await this.prisma.board.findUnique({ where: { id: boardId } });
    if (!board) throw new NotFoundException('Board not found');
    if (board.ownerId !== userId) {
      throw new ForbiddenException('Only the board owner can add members');
    }

    const targetUser = await this.prisma.user.findUnique({ where: { email } });
    if (!targetUser) throw new NotFoundException('User with this email not found');

    if (targetUser.id === userId) {
      throw new ForbiddenException('You cannot add yourself as a member');
    }

    const member = await this.prisma.boardMember.upsert({
      where: { boardId_userId: { boardId, userId: targetUser.id } },
      update: { role: 'EDITOR' },
      create: {
        boardId,
        userId: targetUser.id,
        role: 'EDITOR',
      },
      include: {
        user: { select: { id: true, name: true, email: true } },
      }
    });

    this.boardGateway.broadcastToBoard(boardId, 'member:added', member);
    return member;
  }

  async removeMember(userId: string, boardId: string, memberId: string) {
    const board = await this.prisma.board.findUnique({ where: { id: boardId } });
    if (!board) throw new NotFoundException('Board not found');
    if (board.ownerId !== userId && userId !== memberId) {
      throw new ForbiddenException('Only the board owner can remove members, unless you are leaving the board');
    }

    const deleted = await this.prisma.boardMember.delete({
      where: { boardId_userId: { boardId, userId: memberId } },
    });

    this.boardGateway.broadcastToBoard(boardId, 'member:removed', { userId: memberId });
    return deleted;
  }
}

