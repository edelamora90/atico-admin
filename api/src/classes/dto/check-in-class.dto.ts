import { IsString } from 'class-validator';

export class CheckInClassDto {
  @IsString()
  studentId: string;
}
