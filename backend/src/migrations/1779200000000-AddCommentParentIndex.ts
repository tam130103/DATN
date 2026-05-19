import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddCommentParentIndex1779200000000 implements MigrationInterface {
  name = 'AddCommentParentIndex1779200000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_comments_parent_id" ON "comments" ("parent_id")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_comments_parent_id"`);
  }
}
