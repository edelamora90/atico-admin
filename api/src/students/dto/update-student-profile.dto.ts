import {
  IsBoolean,
  IsDateString,
  IsEmail,
  IsEnum,
  IsOptional,
  IsString,
} from 'class-validator';

import { AcademicArea } from '@prisma/client';

export class UpdateStudentProfileDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsDateString()
  birthDate?: string;

  @IsOptional()
  @IsString()
  bloodType?: string;

  @IsOptional()
  @IsString()
  allergies?: string;

  @IsOptional()
  @IsString()
  medicalConditions?: string;

  @IsOptional()
  @IsString()
  medications?: string;

  @IsOptional()
  @IsString()
  injuries?: string;

  @IsOptional()
  @IsString()
  medicalNotes?: string;

  @IsOptional()
  @IsString()
  emergencyContactName?: string;

  @IsOptional()
  @IsString()
  emergencyContactRelationship?: string;

  @IsOptional()
  @IsString()
  emergencyContactPhone?: string;

  @IsOptional()
  @IsString()
  emergencyContactPhone2?: string;

  @IsOptional()
  @IsEnum(AcademicArea)
  academicArea?: AcademicArea;

  @IsOptional()
  @IsBoolean()
  photoConsent?: boolean;

  @IsOptional()
  @IsBoolean()
  mediaConsent?: boolean;

  @IsOptional()
  @IsBoolean()
  rulesAccepted?: boolean;
}
