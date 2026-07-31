import { MigrationInterface, QueryRunner } from 'typeorm';

export class Orders1700000000008 implements MigrationInterface {
  name = 'Orders1700000000008';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "orders" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "customer_id" uuid NOT NULL REFERENCES "customer_profiles"("id") ON DELETE CASCADE,
        "cook_id" uuid NOT NULL REFERENCES "cook_profiles"("id") ON DELETE CASCADE,
        "delivery_address_label" text NOT NULL,
        "delivery_address_line" text NOT NULL,
        "delivery_area" text,
        "delivery_lat" numeric,
        "delivery_lng" numeric,
        "status" text NOT NULL DEFAULT 'PLACED' CHECK ("status" IN ('PLACED','ACCEPTED','PREPARING','OUT_FOR_DELIVERY','DELIVERED','CANCELLED')),
        "subtotal_paise" integer NOT NULL CHECK ("subtotal_paise" >= 0),
        "delivery_fee_paise" integer NOT NULL DEFAULT 0 CHECK ("delivery_fee_paise" >= 0),
        "total_paise" integer NOT NULL CHECK ("total_paise" >= 0),
        "payment_status" text NOT NULL DEFAULT 'COD' CHECK ("payment_status" IN ('COD','PENDING')),
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now()
      );
      CREATE INDEX "idx_orders_customer_id" ON "orders" ("customer_id");
      CREATE INDEX "idx_orders_cook_id" ON "orders" ("cook_id");
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "orders";`);
  }
}
