import {
  IsBoolean,
  IsDateString,
  IsEmail,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
} from 'class-validator';

import { AcademicArea } from '@prisma/client';

export class CreateStudentDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsString()
  @IsNotEmpty()
  phone: string;

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

  @IsBoolean()
  rulesAccepted: boolean;
}
