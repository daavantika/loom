import { MigrationInterface, QueryRunner } from 'typeorm';

export class OrderItems1700000000009 implements MigrationInterface {
  name = 'OrderItems1700000000009';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "order_items" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "order_id" uuid NOT NULL REFERENCES "orders"("id") ON DELETE CASCADE,
        "menu_item_id" uuid REFERENCES "menu_items"("id") ON DELETE SET NULL,
        "name" text NOT NULL,
        "price_paise" integer NOT NULL CHECK ("price_paise" >= 0),
        "quantity" integer NOT NULL CHECK ("quantity" > 0),
        "line_total_paise" integer NOT NULL CHECK ("line_total_paise" >= 0)
      );
      CREATE INDEX "idx_order_items_order_id" ON "order_items" ("order_id");
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "order_items";`);
  }
}
