import { IsNotEmpty, IsString, IsNumber, IsOptional } from 'class-validator';

export class CreateColumnDto {
  @IsString()
  @IsNotEmpty()
  title!: string;
}

export class UpdateColumnDto {
  @IsString()
  @IsNotEmpty()
  title!: string;
}

export class ReorderColumnDto {
  @IsNumber()
  position!: number;
}
