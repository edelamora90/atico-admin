import {
  IsNotEmpty,
  IsOptional,
  IsString,
} from 'class-validator';

export class LoginDto {
  @IsOptional()
  @IsString()
  username?: string;

  @IsOptional()
  @IsString()
  identifier?: string;

  @IsOptional()
  @IsString()
  email?: string;

  @IsString()
  @IsNotEmpty()
  password: string;
}
