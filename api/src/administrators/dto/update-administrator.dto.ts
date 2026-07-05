import { UserRole } from '@prisma/client';
import { Transform } from 'class-transformer';
import {
  IsEmail,
  IsEnum,
  IsOptional,
  IsString,
  Matches,
  MinLength,
} from 'class-validator';

export class UpdateAdministratorDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  @MinLength(3)
  @Matches(/^[a-zA-Z0-9._-]+$/, {
    message:
      'El nombre de usuario solo puede contener letras, números, punto, guion o guion bajo.',
  })
  username?: string;

  @IsOptional()
  @Transform(({ value }) => value || null)
  @IsEmail()
  email?: string | null;

  @IsOptional()
  @IsString()
  @MinLength(8, {
    message: 'La contraseña debe tener al menos 8 caracteres.',
  })
  password?: string;

  @IsOptional()
  @IsEnum(UserRole)
  role?: UserRole;
}
