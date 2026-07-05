import {
  IsBoolean,
  IsNumber,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';

export class CreateRoomItemDto {
  @IsString()
  name: string;

  @IsNumber()
  @Min(0)
  price: number;

  @IsOptional()
  @IsBoolean()
  active?: boolean;
}
