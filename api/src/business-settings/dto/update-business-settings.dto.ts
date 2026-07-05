import { IsEnum, IsInt, IsOptional, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { RenewalPolicy } from '@prisma/client';

export class UpdateBusinessSettingsDto {
  @IsOptional()
  @IsEnum(RenewalPolicy)
  renewalPolicy?: RenewalPolicy;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  renewalGraceDays?: number;

  @IsOptional()
  @Type(() => Number)
  @Min(0)
  renewalFeeAmount?: number;
}
