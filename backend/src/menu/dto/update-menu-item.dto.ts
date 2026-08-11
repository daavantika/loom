import { ArrayMaxSize, IsArray, IsBoolean, IsInt, IsNumber, IsOptional, IsString, IsUrl, Min, MinLength } from 'class-validator';

export class UpdateMenuItemDto {
  @IsOptional()
  @IsString()
  @MinLength(2)
  name?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  pricePaise?: number;

  // require_tld: false — see SaveOnboardingDto.photoUrls.
  @IsOptional()
  @IsUrl({ require_tld: false })
  imageUrl?: string;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(10)
  @IsString({ each: true })
  tags?: string[];

  @IsOptional()
  @IsBoolean()
  active?: boolean;

  @IsOptional()
  @IsBoolean()
  isTodaysSpecial?: boolean;

  @IsOptional()
  @IsInt()
  @Min(0)
  specialPortionsLeft?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  caloriesKcal?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  proteinG?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  fatG?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  carbsG?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  fibreG?: number;
}
