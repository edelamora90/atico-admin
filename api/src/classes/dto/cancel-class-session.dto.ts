import { ClassSessionCancellationType } from '@prisma/client';
import { IsEnum, IsString, MinLength } from 'class-validator';

export class CancelClassSessionDto {
  @IsEnum(ClassSessionCancellationType)
  cancellationType: ClassSessionCancellationType;

  @IsString()
  @MinLength(3)
  reason: string;
}
