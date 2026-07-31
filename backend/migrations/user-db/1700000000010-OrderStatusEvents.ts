import { MigrationInterface, QueryRunner } from 'typeorm';

export class OrderStatusEvents1700000000010 implements MigrationInterface {
  name = 'OrderStatusEvents1700000000010';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "order_status_events" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "order_id" uuid NOT NULL REFERENCES "orders"("id") ON DELETE CASCADE,
        "status" text NOT NULL CHECK ("status" IN ('PLACED','ACCEPTED','PREPARING','OUT_FOR_DELIVERY','DELIVERED','CANCELLED')),
        "actor_user_id" uuid NOT NULL REFERENCES "users"("id"),
        "note" text,
        "created_at" timestamptz NOT NULL DEFAULT now()
      );
      CREATE INDEX "idx_order_status_events_order_id" ON "order_status_events" ("order_id");
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "order_status_events";`);
  }
}
