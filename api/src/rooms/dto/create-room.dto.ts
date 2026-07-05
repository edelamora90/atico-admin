import {
  IsBoolean,
  IsNumber,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';

export class CreateRoomDto {
  @IsString()
  name: string;

  @IsNumber()
  @Min(1)
  capacity: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  basePrice?: number;

  @IsOptional()
  @IsBoolean()
  active?: boolean;
}
