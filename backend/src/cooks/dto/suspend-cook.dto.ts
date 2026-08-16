import { IsString, MinLength } from 'class-validator';

export class SuspendCookDto {
  @IsString()
  @MinLength(3)
  reason!: string;
}
