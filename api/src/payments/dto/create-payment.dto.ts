import {
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';

import { PaymentConcept } from '@prisma/client';

export class CreatePaymentDto {
  @IsOptional()
  @IsString()
  studentId?: string;

  @IsEnum(PaymentConcept)
  concept: PaymentConcept;

  @IsNumber()
  @Min(0)
  amount: number;

  @IsOptional()
  @IsString()
  notes?: string;
}
