import { MigrationInterface, QueryRunner } from 'typeorm';

export class OrdersPayments1700000000012 implements MigrationInterface {
  name = 'OrdersPayments1700000000012';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "orders"
        ADD COLUMN "payment_method" text NOT NULL DEFAULT 'COD' CHECK ("payment_method" IN ('COD','ONLINE')),
        ADD COLUMN "razorpay_order_id" text,
        ADD COLUMN "razorpay_payment_id" text,
        ADD COLUMN "platform_fee_paise" integer CHECK ("platform_fee_paise" >= 0),
        ADD COLUMN "cook_payout_paise" integer CHECK ("cook_payout_paise" >= 0);

      -- Widen payment_status from ('COD','PENDING') to also allow real online-payment
      -- outcomes. The original CHECK was unnamed, so Postgres auto-named it
      -- <table>_<column>_check.
      ALTER TABLE "orders" DROP CONSTRAINT "orders_payment_status_check";
      ALTER TABLE "orders" ADD CONSTRAINT "orders_payment_status_check" CHECK ("payment_status" IN ('COD','PENDING','PAID','FAILED'));
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "orders" DROP CONSTRAINT "orders_payment_status_check";
      ALTER TABLE "orders" ADD CONSTRAINT "orders_payment_status_check" CHECK ("payment_status" IN ('COD','PENDING'));

      ALTER TABLE "orders"
        DROP COLUMN "payment_method",
        DROP COLUMN "razorpay_order_id",
        DROP COLUMN "razorpay_payment_id",
        DROP COLUMN "platform_fee_paise",
        DROP COLUMN "cook_payout_paise";
    `);
  }
}
