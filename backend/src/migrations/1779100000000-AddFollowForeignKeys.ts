import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddFollowForeignKeys1779100000000 implements MigrationInterface {
  name = 'AddFollowForeignKeys1779100000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DELETE FROM "follows"
      WHERE "followerId" NOT IN (SELECT "id" FROM "users")
         OR "followingId" NOT IN (SELECT "id" FROM "users")
    `);

    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1
          FROM information_schema.table_constraints tc
          JOIN information_schema.key_column_usage kcu
            ON tc.constraint_name = kcu.constraint_name
           AND tc.table_schema = kcu.table_schema
          WHERE tc.table_schema = 'public'
            AND tc.table_name = 'follows'
            AND tc.constraint_type = 'FOREIGN KEY'
            AND kcu.column_name = 'followerId'
        ) THEN
          ALTER TABLE "follows"
          ADD CONSTRAINT "FK_follows_follower_user"
          FOREIGN KEY ("followerId") REFERENCES "users"("id") ON DELETE CASCADE;
        END IF;

        IF NOT EXISTS (
          SELECT 1
          FROM information_schema.table_constraints tc
          JOIN information_schema.key_column_usage kcu
            ON tc.constraint_name = kcu.constraint_name
           AND tc.table_schema = kcu.table_schema
          WHERE tc.table_schema = 'public'
            AND tc.table_name = 'follows'
            AND tc.constraint_type = 'FOREIGN KEY'
            AND kcu.column_name = 'followingId'
        ) THEN
          ALTER TABLE "follows"
          ADD CONSTRAINT "FK_follows_following_user"
          FOREIGN KEY ("followingId") REFERENCES "users"("id") ON DELETE CASCADE;
        END IF;
      END $$;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE IF EXISTS "follows"
      DROP CONSTRAINT IF EXISTS "FK_follows_following_user"
    `);
    await queryRunner.query(`
      ALTER TABLE IF EXISTS "follows"
      DROP CONSTRAINT IF EXISTS "FK_follows_follower_user"
    `);
  }
}
