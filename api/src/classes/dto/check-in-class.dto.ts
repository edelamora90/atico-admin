import { IsOptional, IsString } from 'class-validator';

export class CheckInClassDto {
  @IsString()
  studentId: string;

  @IsOptional()
  @IsString()
  sessionId: string;
}
