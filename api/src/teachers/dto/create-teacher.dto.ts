import {
  IsBoolean,
  IsEmail,
  IsOptional,
  IsString,
} from 'class-validator';

export class CreateTeacherDto {
  @IsString()
  name: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsBoolean()
  active?: boolean;
}
