import { MigrationInterface, QueryRunner } from 'typeorm';

export class CustomerProfiles1700000000004 implements MigrationInterface {
  name = 'CustomerProfiles1700000000004';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "customer_profiles" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "user_id" uuid NOT NULL UNIQUE REFERENCES "users"("id") ON DELETE CASCADE,
        "display_name" text,
        "dietary_preference" text CHECK ("dietary_preference" IN ('VEG','NON_VEG','EGG','VEGAN')),
        "spice_level" text CHECK ("spice_level" IN ('MILD','MEDIUM','HOT')),
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now()
      );
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "customer_profiles";`);
  }
}
