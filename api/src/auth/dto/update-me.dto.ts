import {
  IsOptional,
  IsString,
  Matches,
  MinLength,
} from 'class-validator';

export class UpdateMeDto {
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
  @IsString()
  @MinLength(8, {
    message: 'La contraseña debe tener al menos 8 caracteres.',
  })
  password?: string;
}
