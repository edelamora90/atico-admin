import {
  IsDateString,
  IsNumber,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';

export class CreateRentalDto {
  @IsString()
  customerName: string;

  @IsString()
  roomId: string;

  @IsNumber()
  @Min(0)
  amount: number;

  @IsDateString()
  startDate: string;

  @IsDateString()
  endDate: string;

  @IsOptional()
  @IsString()
  notes?: string;
}
