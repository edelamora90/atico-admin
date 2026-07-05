import {
  IsDateString,
  IsEnum,
  IsNumber,
  IsOptional,
  IsArray,
  IsString,
  Min,
} from 'class-validator';

enum ClassTypeDto {
  CLASS = 'CLASS',
  COURSE = 'COURSE',
  WORKSHOP = 'WORKSHOP',
  RENTAL = 'RENTAL',
}

enum ClassAreaDto {
  DANCE = 'DANCE',
  MUSIC = 'MUSIC',
}

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
}
