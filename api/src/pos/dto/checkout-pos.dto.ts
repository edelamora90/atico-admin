import {
  ArrayNotEmpty,
  IsArray,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Min,
  ValidateIf,
  ValidateNested,
} from 'class-validator';

import { Type } from 'class-transformer';

export enum PosCheckoutItemType {
  ACADEMIC = 'ACADEMIC',
  INSCRIPTION = 'INSCRIPTION',
  RENEWAL = 'RENEWAL',
  STORE = 'STORE',
  RENTAL = 'RENTAL',
  COURSE_EVENT = 'COURSE_EVENT',
}

export class CheckoutPosItemDto {
  @IsEnum(PosCheckoutItemType)
  type: PosCheckoutItemType;

  @ValidateIf((item) => item.type === PosCheckoutItemType.ACADEMIC)
  @IsString()
  packageId?: string;

  @ValidateIf((item) => item.type === PosCheckoutItemType.STORE)
  @IsString()
  productId?: string;

  @ValidateIf((item) => item.type === PosCheckoutItemType.RENTAL)
  @IsString()
  rentalId?: string;

  @ValidateIf((item) => item.type === PosCheckoutItemType.COURSE_EVENT)
  @IsString()
  courseEventId?: string;

  @ValidateIf((item) => {
    return item.type === PosCheckoutItemType.STORE ||
      item.type === PosCheckoutItemType.COURSE_EVENT;
  })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  quantity?: number;

  @IsOptional()
  @IsString()
  participantName?: string;

  @IsOptional()
  @IsString()
  participantPhone?: string;

  @IsOptional()
  @IsString()
  participantEmail?: string;
}

export class CheckoutPosDto {
  @IsOptional()
  @IsString()
  studentId?: string;

  @IsArray()
  @ArrayNotEmpty()
  @ValidateNested({ each: true })
  @Type(() => CheckoutPosItemDto)
  items: CheckoutPosItemDto[];
}
