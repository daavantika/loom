import { IsIn, IsOptional, IsString, MinLength } from 'class-validator';
import { DietaryPreference, SpiceLevel } from '../customer-profile.entity';

export class UpdateCustomerProfileDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  displayName?: string;

  @IsOptional()
  @IsIn(['VEG', 'NON_VEG', 'EGG', 'VEGAN'])
  dietaryPreference?: DietaryPreference;

  @IsOptional()
  @IsIn(['MILD', 'MEDIUM', 'HOT'])
  spiceLevel?: SpiceLevel;
}
