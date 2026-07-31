import { IsString } from 'class-validator';

export class VerifyPaymentDto {
  @IsString()
  razorpayPaymentId!: string;

  @IsString()
  razorpaySignature!: string;
}
