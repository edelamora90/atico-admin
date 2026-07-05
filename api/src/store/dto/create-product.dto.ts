import {
  IsBoolean,
  IsNumber,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';

export class CreateProductDto {
  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  imageUrl?: string;

  @IsNumber()
  @Min(0)
  salePrice: number;

  @IsNumber()
  @Min(0)
  costPrice: number;

  @IsNumber()
  @Min(0)
  stock: number;

  @IsOptional()
  @IsBoolean()
  active?: boolean;
}
