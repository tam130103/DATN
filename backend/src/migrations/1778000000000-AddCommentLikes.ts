import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddCommentLikes1778000000000 implements MigrationInterface {
  name = 'AddCommentLikes1778000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create comment_likes table
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "comment_likes" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "user_id" uuid NOT NULL,
        "comment_id" uuid NOT NULL,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_comment_likes" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_comment_likes_user_comment" UNIQUE ("user_id", "comment_id"),
        CONSTRAINT "FK_comment_likes_user" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_comment_likes_comment" FOREIGN KEY ("comment_id") REFERENCES "comments"("id") ON DELETE CASCADE
      )
    `);

    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_comment_likes_user_id" ON "comment_likes" ("user_id")`);

    // Enable RLS + deny policy (same pattern as 1777400000000)
    await queryRunner.query(`
      DO $$
      BEGIN
        IF to_regclass('public.comment_likes') IS NOT NULL THEN
          ALTER TABLE public.comment_likes ENABLE ROW LEVEL SECURITY;
          DROP POLICY IF EXISTS "deny_direct_api_access" ON public.comment_likes;
          CREATE POLICY "deny_direct_api_access"
            ON public.comment_likes
            FOR ALL
            TO public
            USING (false)
            WITH CHECK (false);
        END IF;
      END $$;
    `);

    // Add COMMENT_LIKE to notification type enum
    await queryRunner.query(`
      ALTER TYPE "notifications_type_enum" ADD VALUE IF NOT EXISTS 'COMMENT_LIKE'
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop RLS policy first
    await queryRunner.query(`
      DO $$
      BEGIN
        IF to_regclass('public.comment_likes') IS NOT NULL THEN
          DROP POLICY IF EXISTS "deny_direct_api_access" ON public.comment_likes;
          ALTER TABLE public.comment_likes DISABLE ROW LEVEL SECURITY;
        END IF;
      END $$;
    `);

    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_comment_likes_user_id"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "comment_likes"`);

    // Note: PostgreSQL does not support removing enum values easily.
    // The COMMENT_LIKE enum value will remain in the type.
  }
}
