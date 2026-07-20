import {
  IsArray,
  IsBoolean,
  IsInt,
  IsNumber,
  IsOptional,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

export class TeacherPaymentRangeDto {
  @IsInt()
  @Min(0)
  @Type(() => Number)
  minStudents: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Type(() => Number)
  maxStudents?: number | null;

  @IsNumber()
  @Min(0)
  @Type(() => Number)
  amount: number;
}

export class UpdateTeacherPaymentSettingsDto {
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  minimumClassAmount: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  cancellationWithPaymentAmount?: number | null;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => TeacherPaymentRangeDto)
  ranges: TeacherPaymentRangeDto[];
}
