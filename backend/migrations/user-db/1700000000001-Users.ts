import { MigrationInterface, QueryRunner } from 'typeorm';

export class Users1700000000001 implements MigrationInterface {
  name = 'Users1700000000001';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "users" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "email" text NOT NULL UNIQUE,
        "password_hash" text NOT NULL,
        "role" text NOT NULL CHECK ("role" IN ('COOK','CUSTOMER')),
        "created_at" timestamptz NOT NULL DEFAULT now()
      );
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "users";`);
  }
}
