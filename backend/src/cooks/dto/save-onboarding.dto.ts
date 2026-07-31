import { Type } from 'class-transformer';
import { ArrayMaxSize, IsArray, IsNumber, IsOptional, IsString, IsUrl, Max, Min, MinLength } from 'class-validator';

export class SaveOnboardingDto {
  @IsOptional()
  @IsString()
  @MinLength(2)
  kitchenName?: string;

  @IsOptional()
  @IsString()
  @MinLength(2)
  ownerName?: string;

  // Required for Razorpay Route linked-account creation once payments are
  // configured — optional here (draft-save step) but SellerRegistration.tsx
  // enforces it before allowing submission.
  @IsOptional()
  @IsString()
  @MinLength(8)
  phone?: string;

  @IsOptional()
  @IsString()
  @MinLength(2)
  area?: string;

  @IsOptional()
  @IsString()
  addressLine?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  lat?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  lng?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0.5)
  @Max(25)
  deliveryRadiusKm?: number;

  @IsOptional()
  @IsString()
  bio?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  minOrderValuePaise?: number;

  // require_tld: false — the uploads endpoint returns absolute URLs built
  // from the request's own host, which in dev/self-hosted deployments is
  // "localhost" or a bare IP with no TLD.
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(10)
  @IsUrl({ require_tld: false }, { each: true })
  photoUrls?: string[];
}
