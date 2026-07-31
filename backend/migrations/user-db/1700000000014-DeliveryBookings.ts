import { MigrationInterface, QueryRunner } from 'typeorm';

export class DeliveryBookings1700000000014 implements MigrationInterface {
  name = 'DeliveryBookings1700000000014';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "delivery_bookings" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "order_id" uuid NOT NULL REFERENCES "orders"("id") ON DELETE CASCADE,
        "status" text NOT NULL DEFAULT 'PENDING' CHECK ("status" IN ('PENDING','SKIPPED','BOOKED','RIDER_ASSIGNED','PICKED_UP','DELIVERED','FAILED','CANCELLED')),
        "porter_order_id" text,
        "pickup_lat" numeric,
        "pickup_lng" numeric,
        "drop_lat" numeric,
        "drop_lng" numeric,
        "rider_name" text,
        "rider_phone" text,
        "tracking_url" text,
        "failure_reason" text,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now()
      );
      CREATE INDEX "idx_delivery_bookings_order_id" ON "delivery_bookings" ("order_id");
      CREATE UNIQUE INDEX "idx_delivery_bookings_porter_order_id" ON "delivery_bookings" ("porter_order_id") WHERE "porter_order_id" IS NOT NULL;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "delivery_bookings";`);
  }
}
