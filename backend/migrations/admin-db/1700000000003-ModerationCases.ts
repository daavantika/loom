import { MigrationInterface, QueryRunner } from 'typeorm';

export class ModerationCases1700000000003 implements MigrationInterface {
  name = 'ModerationCases1700000000003';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "moderation_cases" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "type" text NOT NULL CHECK ("type" IN ('VERIFICATION','QUALITY_COMPLAINT','BULK_CAPACITY_EXCEPTION')),
        "entity_type" text NOT NULL,
        "entity_id" uuid NOT NULL,
        "status" text NOT NULL DEFAULT 'OPEN' CHECK ("status" IN ('OPEN','IN_REVIEW','RESOLVED','REJECTED')),
        "assigned_admin_id" uuid REFERENCES "admin_users"("id"),
        "resolution_notes" text,
        "opened_at" timestamptz NOT NULL DEFAULT now(),
        "resolved_at" timestamptz
      );
      CREATE INDEX "idx_moderation_cases_type_status" ON "moderation_cases" ("type", "status");
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "moderation_cases";`);
  }
}
