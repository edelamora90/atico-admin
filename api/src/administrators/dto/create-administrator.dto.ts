import { UserRole } from '@prisma/client';
import { Transform } from 'class-transformer';
import {
  IsEmail,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  MinLength,
} from 'class-validator';

export class CreateAdministratorDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @MinLength(3)
  @Matches(/^[a-zA-Z0-9._-]+$/, {
    message:
      'El nombre de usuario solo puede contener letras, números, punto, guion o guion bajo.',
  })
  username: string;

  @IsOptional()
  @Transform(({ value }) => value || null)
  @IsEmail()
  email?: string | null;

  @IsString()
  @MinLength(8, {
    message: 'La contraseña debe tener al menos 8 caracteres.',
  })
  password: string;

  @IsEnum(UserRole)
  role: UserRole;
}
