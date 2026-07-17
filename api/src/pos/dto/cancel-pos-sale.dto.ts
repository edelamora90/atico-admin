import { IsString, MinLength } from 'class-validator';

export class CancelPosSaleDto {
  @IsString()
  @MinLength(3)
  reason: string;
}
