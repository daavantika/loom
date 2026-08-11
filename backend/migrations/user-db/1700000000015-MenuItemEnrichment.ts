import { MigrationInterface, QueryRunner } from 'typeorm';

export class MenuItemEnrichment1700000000015 implements MigrationInterface {
  name = 'MenuItemEnrichment1700000000015';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "menu_items"
        ADD COLUMN "is_todays_special" boolean NOT NULL DEFAULT false,
        ADD COLUMN "special_portions_left" integer CHECK ("special_portions_left" >= 0),
        ADD COLUMN "calories_kcal" integer CHECK ("calories_kcal" >= 0),
        ADD COLUMN "protein_g" numeric CHECK ("protein_g" >= 0),
        ADD COLUMN "fat_g" numeric CHECK ("fat_g" >= 0),
        ADD COLUMN "carbs_g" numeric CHECK ("carbs_g" >= 0),
        ADD COLUMN "fibre_g" numeric CHECK ("fibre_g" >= 0);
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "menu_items"
        DROP COLUMN "is_todays_special",
        DROP COLUMN "special_portions_left",
        DROP COLUMN "calories_kcal",
        DROP COLUMN "protein_g",
        DROP COLUMN "fat_g",
        DROP COLUMN "carbs_g",
        DROP COLUMN "fibre_g";
    `);
  }
}
