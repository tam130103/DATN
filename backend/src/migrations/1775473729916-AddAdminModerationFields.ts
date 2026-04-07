import { MigrationInterface, QueryRunner } from "typeorm";

export class AddAdminModerationFields1775473729916 implements MigrationInterface {
    name = 'AddAdminModerationFields1775473729916'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TYPE "public"."reports_targettype_enum" AS ENUM('post', 'comment')`);
        await queryRunner.query(`CREATE TYPE "public"."reports_status_enum" AS ENUM('open', 'resolved', 'rejected')`);
        await queryRunner.query(`CREATE TABLE "reports" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "reporter_id" uuid NOT NULL, "targetType" "public"."reports_targettype_enum" NOT NULL, "target_id" uuid NOT NULL, "reason" text NOT NULL, "status" "public"."reports_status_enum" NOT NULL DEFAULT 'open', "reviewed_by" uuid, "reviewedAt" TIMESTAMP WITH TIME ZONE, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_d9013193989303580053c0b5ef6" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TYPE "public"."users_role_enum" AS ENUM('user', 'admin', 'system')`);
        await queryRunner.query(`ALTER TABLE "users" ADD "role" "public"."users_role_enum" NOT NULL DEFAULT 'user'`);
        await queryRunner.query(`CREATE TYPE "public"."users_status_enum" AS ENUM('active', 'blocked')`);
        await queryRunner.query(`ALTER TABLE "users" ADD "status" "public"."users_status_enum" NOT NULL DEFAULT 'active'`);
        await queryRunner.query(`ALTER TABLE "users" ADD "blockedReason" text`);
        await queryRunner.query(`ALTER TABLE "users" ADD "blockedAt" TIMESTAMP WITH TIME ZONE`);
        await queryRunner.query(`CREATE TYPE "public"."posts_status_enum" AS ENUM('visible', 'hidden', 'deleted')`);
        await queryRunner.query(`ALTER TABLE "posts" ADD "status" "public"."posts_status_enum" NOT NULL DEFAULT 'visible'`);
        await queryRunner.query(`ALTER TABLE "posts" ADD "moderationReason" text`);
        await queryRunner.query(`ALTER TABLE "posts" ADD "moderated_by" uuid`);
        await queryRunner.query(`ALTER TABLE "posts" ADD "moderatedAt" TIMESTAMP WITH TIME ZONE`);
        await queryRunner.query(`CREATE TYPE "public"."comments_status_enum" AS ENUM('visible', 'hidden', 'deleted')`);
        await queryRunner.query(`ALTER TABLE "comments" ADD "status" "public"."comments_status_enum" NOT NULL DEFAULT 'visible'`);
        await queryRunner.query(`ALTER TABLE "comments" ADD "moderationReason" text`);
        await queryRunner.query(`ALTER TABLE "comments" ADD "moderated_by" uuid`);
        await queryRunner.query(`ALTER TABLE "comments" ADD "moderatedAt" TIMESTAMP WITH TIME ZONE`);
        await queryRunner.query(`ALTER TABLE "reports" ADD CONSTRAINT "FK_9459b9bf907a3807ef7143d2ead" FOREIGN KEY ("reporter_id") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "reports" ADD CONSTRAINT "FK_e8fa0bffcaebc921b1e8e42a82f" FOREIGN KEY ("reviewed_by") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "reports" DROP CONSTRAINT "FK_e8fa0bffcaebc921b1e8e42a82f"`);
        await queryRunner.query(`ALTER TABLE "reports" DROP CONSTRAINT "FK_9459b9bf907a3807ef7143d2ead"`);
        await queryRunner.query(`ALTER TABLE "comments" DROP COLUMN "moderatedAt"`);
        await queryRunner.query(`ALTER TABLE "comments" DROP COLUMN "moderated_by"`);
        await queryRunner.query(`ALTER TABLE "comments" DROP COLUMN "moderationReason"`);
        await queryRunner.query(`ALTER TABLE "comments" DROP COLUMN "status"`);
        await queryRunner.query(`DROP TYPE "public"."comments_status_enum"`);
        await queryRunner.query(`ALTER TABLE "posts" DROP COLUMN "moderatedAt"`);
        await queryRunner.query(`ALTER TABLE "posts" DROP COLUMN "moderated_by"`);
        await queryRunner.query(`ALTER TABLE "posts" DROP COLUMN "moderationReason"`);
        await queryRunner.query(`ALTER TABLE "posts" DROP COLUMN "status"`);
        await queryRunner.query(`DROP TYPE "public"."posts_status_enum"`);
        await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "blockedAt"`);
        await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "blockedReason"`);
        await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "status"`);
        await queryRunner.query(`DROP TYPE "public"."users_status_enum"`);
        await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "role"`);
        await queryRunner.query(`DROP TYPE "public"."users_role_enum"`);
        await queryRunner.query(`DROP TABLE "reports"`);
        await queryRunner.query(`DROP TYPE "public"."reports_status_enum"`);
        await queryRunner.query(`DROP TYPE "public"."reports_targettype_enum"`);
    }

}
