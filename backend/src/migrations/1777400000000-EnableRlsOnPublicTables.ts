import { MigrationInterface, QueryRunner } from 'typeorm';

export class EnableRlsOnPublicTables1777400000000
  implements MigrationInterface
{
  name = 'EnableRlsOnPublicTables1777400000000';

  private readonly publicTables = [
    'migrations',
    'follows',
    'notifications',
    'media',
    'post_hashtags',
    'hashtags',
    'post_mentions',
    'likes',
    'conversation_members',
    'messages',
    'users',
    'conversations',
    'posts',
    'comments',
    'reports',
    'saved_posts',
  ];

  public async up(queryRunner: QueryRunner): Promise<void> {
    for (const table of this.publicTables) {
      await queryRunner.query(`
        DO $$
        BEGIN
          IF to_regclass('public.${table}') IS NOT NULL THEN
            ALTER TABLE public.${table} ENABLE ROW LEVEL SECURITY;
            DROP POLICY IF EXISTS "deny_direct_api_access" ON public.${table};
            CREATE POLICY "deny_direct_api_access"
              ON public.${table}
              FOR ALL
              TO public
              USING (false)
              WITH CHECK (false);
          END IF;
        END $$;
      `);
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    for (const table of this.publicTables) {
      await queryRunner.query(`
        DO $$
        BEGIN
          IF to_regclass('public.${table}') IS NOT NULL THEN
            DROP POLICY IF EXISTS "deny_direct_api_access" ON public.${table};
            ALTER TABLE public.${table} DISABLE ROW LEVEL SECURITY;
          END IF;
        END $$;
      `);
    }
  }
}
