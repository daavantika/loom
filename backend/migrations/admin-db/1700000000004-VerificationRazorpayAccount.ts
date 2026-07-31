import { MigrationInterface, QueryRunner } from 'typeorm';

export class VerificationRazorpayAccount1700000000004 implements MigrationInterface {
  name = 'VerificationRazorpayAccount1700000000004';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "verification_records"
        ADD COLUMN "razorpay_account_id" text,
        ADD COLUMN "razorpay_account_status" text CHECK ("razorpay_account_status" IN ('PENDING','CREATED','FAILED'));
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "verification_records"
        DROP COLUMN "razorpay_account_id",
        DROP COLUMN "razorpay_account_status";
    `);
  }
}
