import { MigrationInterface, QueryRunner } from 'typeorm';

export class CookSuspensions1700000000005 implements MigrationInterface {
  name = 'CookSuspensions1700000000005';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "cook_suspensions" (
        "cook_id" uuid PRIMARY KEY,
        "reason" text,
        "suspended_by" uuid NOT NULL REFERENCES "admin_users"("id"),
        "suspended_at" timestamptz NOT NULL DEFAULT now()
      );
      -- cook_id intentionally has no FK: cook_profiles lives in the user DB,
      -- a separate physical database, same pattern as verification_records.
      -- A cook is "suspended" iff a row exists here — reinstating deletes it.
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "cook_suspensions";`);
  }
}
