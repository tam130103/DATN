import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddUniqueGoogleId1780000000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE UNIQUE INDEX "IDX_users_googleId_unique_not_null"
      ON "users" ("googleId")
      WHERE "googleId" IS NOT NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_users_googleId_unique_not_null"`);
  }
}