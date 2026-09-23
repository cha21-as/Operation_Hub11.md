import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class IntakeRequestDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(1000)
  freeText: string;
}