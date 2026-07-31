import { MigrationInterface, QueryRunner } from 'typeorm';

export class CustomerAddresses1700000000005 implements MigrationInterface {
  name = 'CustomerAddresses1700000000005';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "customer_addresses" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "customer_id" uuid NOT NULL REFERENCES "customer_profiles"("id") ON DELETE CASCADE,
        "label" text NOT NULL,
        "address_line" text NOT NULL,
        "area" text,
        "lat" numeric,
        "lng" numeric,
        "is_default" boolean NOT NULL DEFAULT false,
        "created_at" timestamptz NOT NULL DEFAULT now()
      );
      CREATE INDEX "idx_customer_addresses_customer_id" ON "customer_addresses" ("customer_id");
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "customer_addresses";`);
  }
}
