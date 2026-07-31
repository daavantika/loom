import { Type } from 'class-transformer';
import { IsBoolean, IsNumber, IsOptional, IsString, MinLength } from 'class-validator';

export class SaveAddressDto {
  @IsString()
  @MinLength(1)
  label!: string;

  @IsString()
  @MinLength(3)
  addressLine!: string;

  @IsOptional()
  @IsString()
  area?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  lat?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  lng?: number;

  @IsOptional()
  @IsBoolean()
  isDefault?: boolean;
}
