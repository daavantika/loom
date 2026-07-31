import { MigrationInterface, QueryRunner } from 'typeorm';

export class KitchenPhotos1700000000003 implements MigrationInterface {
  name = 'KitchenPhotos1700000000003';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "kitchen_photos" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "cook_id" uuid NOT NULL REFERENCES "cook_profiles"("id") ON DELETE CASCADE,
        "url" text NOT NULL,
        "sort_order" integer NOT NULL DEFAULT 0
      );
      CREATE INDEX "idx_kitchen_photos_cook_id" ON "kitchen_photos" ("cook_id");
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "kitchen_photos";`);
  }
}
