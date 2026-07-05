import { IsEnum, IsOptional, IsString } from 'class-validator';
import { AttendanceStatus } from '@prisma/client';

export class CreateAttendanceDto {
  @IsOptional()
  @IsString()
  reservationId?: string;

  @IsOptional()
  @IsString()
  studentId?: string;

  @IsOptional()
  @IsString()
  classId?: string;

  @IsEnum(AttendanceStatus)
  status: AttendanceStatus;
}
