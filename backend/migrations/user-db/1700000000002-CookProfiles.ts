import { MigrationInterface, QueryRunner } from 'typeorm';

export class CookProfiles1700000000002 implements MigrationInterface {
  name = 'CookProfiles1700000000002';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "cook_profiles" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "user_id" uuid NOT NULL UNIQUE REFERENCES "users"("id") ON DELETE CASCADE,
        "kitchen_name" text,
        "owner_name" text,
        "area" text,
        "address_line" text,
        "lat" numeric,
        "lng" numeric,
        "delivery_radius_km" numeric,
        "bio" text,
        "min_order_value_paise" integer NOT NULL DEFAULT 0 CHECK ("min_order_value_paise" >= 0),
        "status" text NOT NULL DEFAULT 'DRAFT' CHECK ("status" IN ('DRAFT','PENDING_VERIFICATION')),
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now()
      );
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "cook_profiles";`);
  }
}
