import { IsIn, IsOptional, IsString, MinLength } from 'class-validator';
import { PayoutMethod } from '../verification-record.entity';

export class SubmitVerificationDto {
  @IsOptional()
  @IsString()
  fssaiNumber?: string;

  @IsOptional()
  @IsString()
  fssaiDocUrl?: string;

  @IsIn(['UPI', 'BANK'])
  payoutMethod!: PayoutMethod;

  /** Raw UPI ID or bank account details — encrypted at rest, never stored or returned as plaintext. */
  @IsString()
  @MinLength(3)
  payoutDetails!: string;
}
