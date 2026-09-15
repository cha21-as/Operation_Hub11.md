import { IsEnum, IsNotEmpty, IsString, MaxLength } from 'class-validator';
import { Department } from '../department.enum';

// Validated on purpose: a request with a missing title or an unknown
// department is rejected with 400 before it ever reaches the service
// or the database.
export class CreateRequestDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  title: string;

  @IsEnum(Department)
  department: Department;
}
