import { AcademicArea, PackageType } from '@prisma/client';

import {
  IsBoolean,
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';

export class CreatePackageDto {
  @IsString()
  name: string;

  @IsOptional()
  @IsEnum(PackageType)
  type?: PackageType;

  @IsNumber()
  @Min(0)
  price: number;

  @IsNumber()
  @Min(0)
  credits: number;

  @IsNumber()
  @Min(0)
  teacherPercentage: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  atticPercentage?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  teacherPaymentPerClass?: number;

  @IsOptional()
  @IsBoolean()
  active?: boolean;

  @IsOptional()
  @IsBoolean()
  requiresEnrollment?: boolean;

  @IsOptional()
  @IsBoolean()
  includesFreeInscription?: boolean;

  @IsOptional()
  @IsBoolean()
  isTrial?: boolean;

  @IsOptional()
  @IsEnum(AcademicArea)
  area?: AcademicArea;
}
