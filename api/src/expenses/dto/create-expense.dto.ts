import {
  IsDateString,
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  Min,
  MinLength,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ExpenseCategory } from '@prisma/client';

export class CreateExpenseDto {
  @IsString()
  @MinLength(2)
  concept: string;

  @IsOptional()
  @IsEnum(ExpenseCategory)
  category?: ExpenseCategory;

  @IsNumber()
  @Min(0.01)
  @Type(() => Number)
  amount: number;

  @IsDateString()
  date: string;

  @IsOptional()
  @IsString()
  notes?: string;
}
