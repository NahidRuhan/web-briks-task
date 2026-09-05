import { IsNotEmpty, IsString, IsOptional, IsNumber } from 'class-validator';

export class CreateTaskDto {
  @IsString()
  @IsNotEmpty()
  title!: string;

  @IsString()
  @IsOptional()
  description?: string;
}

export class UpdateTaskDto {
  @IsString()
  @IsOptional()
  title?: string;

  @IsString()
  @IsOptional()
  description?: string;
}

export class MoveTaskDto {
  @IsString()
  @IsNotEmpty()
  targetColumnId!: string;

  @IsNumber()
  position!: number; // target index (0-based) among tasks in the target column
}
