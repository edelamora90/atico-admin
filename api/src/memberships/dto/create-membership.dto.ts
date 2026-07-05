import { IsString } from 'class-validator';

export class CreateMembershipDto {
  @IsString()
  studentId: string;

  @IsString()
  packageId: string;
}
