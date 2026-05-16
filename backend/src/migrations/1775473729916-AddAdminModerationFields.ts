import { MigrationInterface, QueryRunner } from "typeorm";

export class AddAdminModerationFields1775473729916 implements MigrationInterface {
    name = 'AddAdminModerationFields1775473729916'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            DO $$
            BEGIN
              IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'reports_targettype_enum') THEN
                CREATE TYPE "public"."reports_targettype_enum" AS ENUM('post', 'comment');
              END IF;
              IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'reports_status_enum') THEN
                CREATE TYPE "public"."reports_status_enum" AS ENUM('open', 'resolved', 'rejected');
              END IF;
              IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'users_role_enum') THEN
                CREATE TYPE "public"."users_role_enum" AS ENUM('user', 'admin', 'system');
              END IF;
              IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'users_status_enum') THEN
                CREATE TYPE "public"."users_status_enum" AS ENUM('active', 'blocked');
              END IF;
              IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'posts_status_enum') THEN
                CREATE TYPE "public"."posts_status_enum" AS ENUM('visible', 'hidden', 'deleted');
              END IF;
              IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'comments_status_enum') THEN
                CREATE TYPE "public"."comments_status_enum" AS ENUM('visible', 'hidden', 'deleted');
              END IF;
            END $$;
        `);
        await queryRunner.query(`CREATE TABLE IF NOT EXISTS "reports" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "reporter_id" uuid NOT NULL, "targetType" "public"."reports_targettype_enum" NOT NULL, "target_id" uuid NOT NULL, "reason" text NOT NULL, "status" "public"."reports_status_enum" NOT NULL DEFAULT 'open', "reviewed_by" uuid, "reviewedAt" TIMESTAMP WITH TIME ZONE, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_d9013193989303580053c0b5ef6" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_reports_target" ON "reports" ("targetType", "target_id")`);
        await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_reports_status" ON "reports" ("status")`);
        await queryRunner.query(`ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "role" "public"."users_role_enum" NOT NULL DEFAULT 'user'`);
        await queryRunner.query(`ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "status" "public"."users_status_enum" NOT NULL DEFAULT 'active'`);
        await queryRunner.query(`ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "blockedReason" text`);
        await queryRunner.query(`ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "blockedAt" TIMESTAMP WITH TIME ZONE`);
        await queryRunner.query(`ALTER TABLE "posts" ADD COLUMN IF NOT EXISTS "status" "public"."posts_status_enum" NOT NULL DEFAULT 'visible'`);
        await queryRunner.query(`ALTER TABLE "posts" ADD COLUMN IF NOT EXISTS "moderationReason" text`);
        await queryRunner.query(`ALTER TABLE "posts" ADD COLUMN IF NOT EXISTS "moderated_by" uuid`);
        await queryRunner.query(`ALTER TABLE "posts" ADD COLUMN IF NOT EXISTS "moderatedAt" TIMESTAMP WITH TIME ZONE`);
        await queryRunner.query(`ALTER TABLE "comments" ADD COLUMN IF NOT EXISTS "status" "public"."comments_status_enum" NOT NULL DEFAULT 'visible'`);
        await queryRunner.query(`ALTER TABLE "comments" ADD COLUMN IF NOT EXISTS "moderationReason" text`);
        await queryRunner.query(`ALTER TABLE "comments" ADD COLUMN IF NOT EXISTS "moderated_by" uuid`);
        await queryRunner.query(`ALTER TABLE "comments" ADD COLUMN IF NOT EXISTS "moderatedAt" TIMESTAMP WITH TIME ZONE`);
        await queryRunner.query(`
            DO $$
            BEGIN
              IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'FK_9459b9bf907a3807ef7143d2ead') THEN
                ALTER TABLE "reports" ADD CONSTRAINT "FK_9459b9bf907a3807ef7143d2ead" FOREIGN KEY ("reporter_id") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;
              END IF;
              IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'FK_e8fa0bffcaebc921b1e8e42a82f') THEN
                ALTER TABLE "reports" ADD CONSTRAINT "FK_e8fa0bffcaebc921b1e8e42a82f" FOREIGN KEY ("reviewed_by") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;
              END IF;
            END $$;
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE IF EXISTS "reports" DROP CONSTRAINT IF EXISTS "FK_e8fa0bffcaebc921b1e8e42a82f"`);
        await queryRunner.query(`ALTER TABLE IF EXISTS "reports" DROP CONSTRAINT IF EXISTS "FK_9459b9bf907a3807ef7143d2ead"`);
        await queryRunner.query(`ALTER TABLE IF EXISTS "comments" DROP COLUMN IF EXISTS "moderatedAt"`);
        await queryRunner.query(`ALTER TABLE IF EXISTS "comments" DROP COLUMN IF EXISTS "moderated_by"`);
        await queryRunner.query(`ALTER TABLE IF EXISTS "comments" DROP COLUMN IF EXISTS "moderationReason"`);
        await queryRunner.query(`ALTER TABLE IF EXISTS "comments" DROP COLUMN IF EXISTS "status"`);
        await queryRunner.query(`DROP TYPE IF EXISTS "public"."comments_status_enum"`);
        await queryRunner.query(`ALTER TABLE IF EXISTS "posts" DROP COLUMN IF EXISTS "moderatedAt"`);
        await queryRunner.query(`ALTER TABLE IF EXISTS "posts" DROP COLUMN IF EXISTS "moderated_by"`);
        await queryRunner.query(`ALTER TABLE IF EXISTS "posts" DROP COLUMN IF EXISTS "moderationReason"`);
        await queryRunner.query(`ALTER TABLE IF EXISTS "posts" DROP COLUMN IF EXISTS "status"`);
        await queryRunner.query(`DROP TYPE IF EXISTS "public"."posts_status_enum"`);
        await queryRunner.query(`ALTER TABLE IF EXISTS "users" DROP COLUMN IF EXISTS "blockedAt"`);
        await queryRunner.query(`ALTER TABLE IF EXISTS "users" DROP COLUMN IF EXISTS "blockedReason"`);
        await queryRunner.query(`ALTER TABLE IF EXISTS "users" DROP COLUMN IF EXISTS "status"`);
        await queryRunner.query(`DROP TYPE IF EXISTS "public"."users_status_enum"`);
        await queryRunner.query(`ALTER TABLE IF EXISTS "users" DROP COLUMN IF EXISTS "role"`);
        await queryRunner.query(`DROP TYPE IF EXISTS "public"."users_role_enum"`);
        await queryRunner.query(`DROP TABLE IF EXISTS "reports"`);
        await queryRunner.query(`DROP TYPE IF EXISTS "public"."reports_status_enum"`);
        await queryRunner.query(`DROP TYPE IF EXISTS "public"."reports_targettype_enum"`);
    }

}
