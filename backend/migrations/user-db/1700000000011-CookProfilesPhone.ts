import { MigrationInterface, QueryRunner } from 'typeorm';

export class CookProfilesPhone1700000000011 implements MigrationInterface {
  name = 'CookProfilesPhone1700000000011';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "cook_profiles" ADD COLUMN "phone" text;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "cook_profiles" DROP COLUMN "phone";`);
  }
}
