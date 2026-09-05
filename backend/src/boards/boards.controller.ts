import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards } from '@nestjs/common';
import { BoardsService } from './boards.service.js';
import { CreateBoardDto, UpdateBoardDto } from './dto/board.dto.js';
import { CurrentUser } from '../common/decorators/current-user.decorator.js';
import { BoardAccessGuard } from '../common/guards/board-access.guard.js';

@Controller('api/boards')
export class BoardsController {
  constructor(private readonly boardsService: BoardsService) {}

  @Post()
  create(@CurrentUser() user: any, @Body() createBoardDto: CreateBoardDto) {
    return this.boardsService.create(user.userId, createBoardDto);
  }

  @Get()
  findAll(@CurrentUser() user: any) {
    return this.boardsService.findAll(user.userId);
  }

  @UseGuards(BoardAccessGuard)
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.boardsService.findOne(id);
  }

  @UseGuards(BoardAccessGuard)
  @Patch(':id')
  update(@Param('id') id: string, @Body() updateBoardDto: UpdateBoardDto) {
    return this.boardsService.update(id, updateBoardDto);
  }

  @UseGuards(BoardAccessGuard)
  @Delete(':id')
  remove(@CurrentUser() user: any, @Param('id') id: string) {
    return this.boardsService.remove(user.userId, id);
  }

  @UseGuards(BoardAccessGuard)
  @Get(':id/members')
  getMembers(@Param('id') id: string) {
    return this.boardsService.getMembers(id);
  }

  @UseGuards(BoardAccessGuard)
  @Post(':id/members')
  addMember(
    @CurrentUser() user: any, 
    @Param('id') id: string,
    @Body('email') email: string
  ) {
    return this.boardsService.addMember(user.userId, id, email);
  }

  @UseGuards(BoardAccessGuard)
  @Delete(':id/members/:memberId')
  removeMember(
    @CurrentUser() user: any, 
    @Param('id') id: string,
    @Param('memberId') memberId: string
  ) {
    return this.boardsService.removeMember(user.userId, id, memberId);
  }
}

