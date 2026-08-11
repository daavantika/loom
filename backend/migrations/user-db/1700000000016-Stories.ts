import { MigrationInterface, QueryRunner } from 'typeorm';

export class Stories1700000000016 implements MigrationInterface {
  name = 'Stories1700000000016';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "stories" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "cook_id" uuid NOT NULL REFERENCES "cook_profiles"("id") ON DELETE CASCADE,
        "title" text NOT NULL,
        "body" text NOT NULL,
        "created_at" timestamptz NOT NULL DEFAULT now()
      );
      CREATE INDEX "idx_stories_cook_id" ON "stories" ("cook_id");
      CREATE INDEX "idx_stories_created_at" ON "stories" ("created_at" DESC);
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "stories";`);
  }
}
