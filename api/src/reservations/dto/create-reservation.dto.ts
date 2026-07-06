import { IsString } from 'class-validator';

export class CreateReservationDto {
  @IsString()
  studentId: string;

  @IsString()
  sessionId: string;
}
