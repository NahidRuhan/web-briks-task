import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards } from '@nestjs/common';
import { TasksService } from './tasks.service.js';
import { CreateTaskDto, UpdateTaskDto, MoveTaskDto } from './dto/task.dto.js';
import { BoardAccessGuard } from '../common/guards/board-access.guard.js';

@UseGuards(BoardAccessGuard)
@Controller('api')
export class TasksController {
  constructor(private readonly tasksService: TasksService) {}

  @Post('columns/:columnId/tasks')
  create(@Param('columnId') columnId: string, @Body() createTaskDto: CreateTaskDto) {
    return this.tasksService.create(columnId, createTaskDto);
  }

  @Get('tasks/:id')
  findOne(@Param('id') id: string) {
    return this.tasksService.findOne(id);
  }

  @Patch('tasks/:id')
  update(@Param('id') id: string, @Body() updateTaskDto: UpdateTaskDto) {
    return this.tasksService.update(id, updateTaskDto);
  }

  @Patch('tasks/:id/move')
  move(@Param('id') id: string, @Body() moveTaskDto: MoveTaskDto) {
    return this.tasksService.move(id, moveTaskDto);
  }

  @Delete('tasks/:id')
  remove(@Param('id') id: string) {
    return this.tasksService.remove(id);
  }
}
