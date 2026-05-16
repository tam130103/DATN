import { MigrationInterface, QueryRunner } from "typeorm";

export class AddSavedPosts1775461415765 implements MigrationInterface {
    name = 'AddSavedPosts1775461415765'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP INDEX IF EXISTS "public"."IDX_posts_user_source_sourceId"`);
        await queryRunner.query(`CREATE UNIQUE INDEX IF NOT EXISTS "IDX_posts_user_source_sourceId" ON "posts" ("user_id", "source", "sourceId")`);
        await queryRunner.query(`CREATE TABLE IF NOT EXISTS "saved_posts" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "user_id" uuid NOT NULL, "post_id" uuid NOT NULL, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_868375ca4f041a2337a1c1a6634" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_78c961371a509e86d789714dd4" ON "saved_posts" ("user_id") `);
        await queryRunner.query(`CREATE UNIQUE INDEX IF NOT EXISTS "IDX_837a562f71fec3009c9af77ee5" ON "saved_posts" ("user_id", "post_id") `);
        await queryRunner.query(`ALTER TABLE "conversations" ADD COLUMN IF NOT EXISTS "difyConversationId" character varying`);
        await queryRunner.query(`
            DO $$
            BEGIN
              IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'FK_78c961371a509e86d789714dd4f') THEN
                ALTER TABLE "saved_posts" ADD CONSTRAINT "FK_78c961371a509e86d789714dd4f" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;
              END IF;
              IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'FK_116e9df57f5221cc1a77c3d1cfe') THEN
                ALTER TABLE "saved_posts" ADD CONSTRAINT "FK_116e9df57f5221cc1a77c3d1cfe" FOREIGN KEY ("post_id") REFERENCES "posts"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;
              END IF;
            END $$;
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE IF EXISTS "saved_posts" DROP CONSTRAINT IF EXISTS "FK_116e9df57f5221cc1a77c3d1cfe"`);
        await queryRunner.query(`ALTER TABLE IF EXISTS "saved_posts" DROP CONSTRAINT IF EXISTS "FK_78c961371a509e86d789714dd4f"`);
        await queryRunner.query(`ALTER TABLE IF EXISTS "conversations" DROP COLUMN IF EXISTS "difyConversationId"`);
        await queryRunner.query(`ALTER TABLE IF EXISTS "conversations" ADD COLUMN IF NOT EXISTS "difyConversationId" character varying(255)`);
        await queryRunner.query(`DROP INDEX IF EXISTS "public"."IDX_837a562f71fec3009c9af77ee5"`);
        await queryRunner.query(`DROP INDEX IF EXISTS "public"."IDX_78c961371a509e86d789714dd4"`);
        await queryRunner.query(`DROP TABLE IF EXISTS "saved_posts"`);
        await queryRunner.query(`DROP INDEX IF EXISTS "public"."IDX_posts_user_source_sourceId"`);
        await queryRunner.query(`CREATE UNIQUE INDEX IF NOT EXISTS "IDX_posts_user_source_sourceId" ON "posts" ("source", "sourceId", "user_id") `);
    }

}
