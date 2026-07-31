import { IsEmail, IsIn, MinLength } from 'class-validator';
import { UserRole } from '../role';

export class RegisterDto {
  @IsEmail()
  email!: string;

  @MinLength(8)
  password!: string;

  @IsIn(['COOK', 'CUSTOMER'])
  role!: Exclude<UserRole, 'ADMIN'>;
}
