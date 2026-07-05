import { IsString } from 'class-validator';

export class CreateReservationDto {
  @IsString()
  studentId: string;

  @IsString()
  classId: string;
}
