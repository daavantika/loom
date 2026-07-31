import { MigrationInterface, QueryRunner } from 'typeorm';

export class MenuItems1700000000007 implements MigrationInterface {
  name = 'MenuItems1700000000007';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "menu_items" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "cook_id" uuid NOT NULL REFERENCES "cook_profiles"("id") ON DELETE CASCADE,
        "name" text NOT NULL,
        "description" text,
        "price_paise" integer NOT NULL CHECK ("price_paise" >= 0),
        "image_url" text,
        "tags" text[] NOT NULL DEFAULT '{}',
        "active" boolean NOT NULL DEFAULT true,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now()
      );
      CREATE INDEX "idx_menu_items_cook_id" ON "menu_items" ("cook_id");
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "menu_items";`);
  }
}
