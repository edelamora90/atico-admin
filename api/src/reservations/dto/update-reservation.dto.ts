import { IsEnum, IsOptional } from 'class-validator';
import { ReservationStatus } from '@prisma/client';

export class UpdateReservationDto {
  @IsOptional()
  @IsEnum(ReservationStatus)
  status?: ReservationStatus;
}
