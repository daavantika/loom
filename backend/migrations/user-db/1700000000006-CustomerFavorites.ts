import { MigrationInterface, QueryRunner } from 'typeorm';

export class CustomerFavorites1700000000006 implements MigrationInterface {
  name = 'CustomerFavorites1700000000006';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "customer_favorites" (
        "customer_id" uuid NOT NULL REFERENCES "customer_profiles"("id") ON DELETE CASCADE,
        "cook_id" uuid NOT NULL REFERENCES "cook_profiles"("id") ON DELETE CASCADE,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        PRIMARY KEY ("customer_id", "cook_id")
      );
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "customer_favorites";`);
  }
}
