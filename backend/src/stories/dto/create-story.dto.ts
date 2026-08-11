import { IsString, MinLength } from 'class-validator';

export class CreateStoryDto {
  @IsString()
  @MinLength(2)
  title!: string;

  @IsString()
  @MinLength(2)
  body!: string;
}
