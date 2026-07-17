import {
  IsDateString,
  IsBoolean,
  IsEnum,
  IsIn,
  IsInt,
  IsNumber,
  IsOptional,
  IsArray,
  IsString,
  Matches,
  Max,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';

enum ClassTypeDto {
  CLASS = 'CLASS',
  COURSE = 'COURSE',
  WORKSHOP = 'WORKSHOP',
  EVENT = 'EVENT',
  RENTAL = 'RENTAL',
}

enum ClassAreaDto {
  DANCE = 'DANCE',
  MUSIC = 'MUSIC',
}

const recurrenceTypes = ['NONE', 'WEEKLY', 'CUSTOM'] as const;

export class CreateClassDto {
  @IsOptional()
  @IsString()
  courseId?: string;

  @IsOptional()
  @IsString()
  teacherId?: string;

  @IsString()
  roomId: string;

  @IsEnum(ClassTypeDto)
  type: ClassTypeDto;

  @IsOptional()
  @IsEnum(ClassAreaDto)
  area?: ClassAreaDto;

  @IsString()
  title: string;

  @IsDateString()
  startDate: string;

  @IsDateString()
  endDate: string;

  @IsNumber()
  @Min(1)
  durationMinutes: number;

  @IsNumber()
  @Min(1)
  capacity: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  teacherPaymentAmount?: number;

  @IsOptional()
  @IsArray()
  rentalItemIds?: string[];

  @IsOptional()
  @IsIn(recurrenceTypes)
  recurrenceType?: 'NONE' | 'WEEKLY' | 'CUSTOM';

  @IsOptional()
  @IsArray()
  @IsInt({ each: true })
  @Min(0, { each: true })
  @Max(6, { each: true })
  @Type(() => Number)
  daysOfWeek?: number[];

  @IsOptional()
  @IsArray()
  weeklySchedules?: Array<{
    dayOfWeek: number;
    startTime: string;
    endTime: string;
  }>;

  @IsOptional()
  @IsArray()
  eventFunctions?: Array<{
    date: string;
    startTime: string;
    endTime: string;
  }>;

  @IsOptional()
  @IsString()
  @Matches(/^([01]\d|2[0-3]):[0-5]\d$/)
  startTime?: string;

  @IsOptional()
  @IsString()
  @Matches(/^([01]\d|2[0-3]):[0-5]\d$/)
  endTime?: string;

  @IsOptional()
  @IsDateString()
  recurrenceStart?: string;

  @IsOptional()
  @IsDateString()
  recurrenceEnd?: string;

  @IsOptional()
  @IsBoolean()
  requiresEnrollment?: boolean;

  @IsOptional()
  @IsBoolean()
  requiresPackage?: boolean;

  @IsOptional()
  @IsNumber()
  @Min(0)
  directEnrollmentCost?: number | null;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  teacherDirectPercentage?: number | null;
}
