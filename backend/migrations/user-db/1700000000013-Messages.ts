import { MigrationInterface, QueryRunner } from 'typeorm';

export class Messages1700000000013 implements MigrationInterface {
  name = 'Messages1700000000013';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "messages" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "cook_id" uuid NOT NULL REFERENCES "cook_profiles"("id") ON DELETE CASCADE,
        "customer_id" uuid NOT NULL REFERENCES "customer_profiles"("id") ON DELETE CASCADE,
        "sender_role" text NOT NULL CHECK ("sender_role" IN ('COOK','CUSTOMER')),
        "body" text NOT NULL,
        "read_at" timestamptz,
        "created_at" timestamptz NOT NULL DEFAULT now()
      );
      CREATE INDEX "idx_messages_thread" ON "messages" ("cook_id", "customer_id", "created_at");
      CREATE INDEX "idx_messages_cook_unread" ON "messages" ("cook_id", "read_at");
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "messages";`);
  }
}
