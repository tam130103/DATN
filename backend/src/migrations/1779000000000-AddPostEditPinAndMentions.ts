import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddPostEditPinAndMentions1779000000000 implements MigrationInterface {
  name = 'AddPostEditPinAndMentions1779000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "posts"
        ADD COLUMN IF NOT EXISTS "isPinned" boolean NOT NULL DEFAULT false,
        ADD COLUMN IF NOT EXISTS "isEdited" boolean NOT NULL DEFAULT false
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "post_mentions" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "post_id" uuid NOT NULL,
        "user_id" uuid NOT NULL,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_post_mentions" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_post_mentions_post_id"
      ON "post_mentions" ("post_id")
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_post_mentions_user_id"
      ON "post_mentions" ("user_id")
    `);

    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1
          FROM pg_constraint
          WHERE conname = 'FK_post_mentions_post'
        ) THEN
          ALTER TABLE "post_mentions"
          ADD CONSTRAINT "FK_post_mentions_post"
          FOREIGN KEY ("post_id") REFERENCES "posts"("id") ON DELETE CASCADE;
        END IF;
      END $$;
    `);

    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1
          FROM pg_constraint
          WHERE conname = 'FK_post_mentions_user'
        ) THEN
          ALTER TABLE "post_mentions"
          ADD CONSTRAINT "FK_post_mentions_user"
          FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE;
        END IF;
      END $$;
    `);

    await queryRunner.query(`
      ALTER TABLE public.post_mentions ENABLE ROW LEVEL SECURITY;
      DROP POLICY IF EXISTS "deny_direct_api_access" ON public.post_mentions;
      CREATE POLICY "deny_direct_api_access"
        ON public.post_mentions
        FOR ALL
        TO public
        USING (false)
        WITH CHECK (false)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DO $$
      BEGIN
        IF to_regclass('public.post_mentions') IS NOT NULL THEN
          DROP POLICY IF EXISTS "deny_direct_api_access" ON public.post_mentions;
          ALTER TABLE public.post_mentions DISABLE ROW LEVEL SECURITY;
        END IF;
      END $$;
    `);
    await queryRunner.query(`DROP TABLE IF EXISTS "post_mentions"`);
    await queryRunner.query(`ALTER TABLE "posts" DROP COLUMN IF EXISTS "isEdited"`);
    await queryRunner.query(`ALTER TABLE "posts" DROP COLUMN IF EXISTS "isPinned"`);
  }
}
