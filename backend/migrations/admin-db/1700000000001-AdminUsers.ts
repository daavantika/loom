import { MigrationInterface, QueryRunner } from 'typeorm';

export class AdminUsers1700000000001 implements MigrationInterface {
  name = 'AdminUsers1700000000001';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "admin_users" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "email" text NOT NULL UNIQUE,
        "password_hash" text NOT NULL,
        "role" text NOT NULL DEFAULT 'ADMIN' CHECK ("role" IN ('ADMIN')),
        "created_at" timestamptz NOT NULL DEFAULT now()
      );
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "admin_users";`);
  }
}
