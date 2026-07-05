import {
  IsNumber,
  IsString,
  Min,
} from 'class-validator';

export class CreateSaleDto {
  @IsString()
  productId: string;

  @IsNumber()
  @Min(1)
  quantity: number;
}
