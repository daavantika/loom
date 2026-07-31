import { MigrationInterface, QueryRunner } from 'typeorm';

export class VerificationRecords1700000000002 implements MigrationInterface {
  name = 'VerificationRecords1700000000002';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "verification_records" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "cook_id" uuid NOT NULL,
        "type" text NOT NULL CHECK ("type" IN ('INITIAL','RENEWAL')),
        "fssai_number" text,
        "fssai_doc_url" text,
        "payout_method" text NOT NULL CHECK ("payout_method" IN ('UPI','BANK')),
        "payout_details_encrypted" bytea NOT NULL,
        "status" text NOT NULL DEFAULT 'SUBMITTED' CHECK ("status" IN ('SUBMITTED','IN_REVIEW','APPROVED','REJECTED','CHANGES_REQUESTED')),
        "reviewed_by" uuid REFERENCES "admin_users"("id"),
        "reviewed_at" timestamptz,
        "rejection_reason" text,
        "created_at" timestamptz NOT NULL DEFAULT now()
      );
      -- cook_id intentionally has no FK: cook_profiles lives in the user DB,
      -- a separate physical database. Validated at the application layer
      -- (CooksService always passes an id from an already-loaded CookProfile).
      CREATE INDEX "idx_verification_records_cook_id" ON "verification_records" ("cook_id");
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "verification_records";`);
  }
}
