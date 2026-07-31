import { ArrayMaxSize, IsArray, IsInt, IsOptional, IsString, IsUrl, Min, MinLength } from 'class-validator';

export class SaveMenuItemDto {
  @IsString()
  @MinLength(2)
  name!: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsInt()
  @Min(0)
  pricePaise!: number;

  // require_tld: false — see SaveOnboardingDto.photoUrls.
  @IsOptional()
  @IsUrl({ require_tld: false })
  imageUrl?: string;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(10)
  @IsString({ each: true })
  tags?: string[];
}
