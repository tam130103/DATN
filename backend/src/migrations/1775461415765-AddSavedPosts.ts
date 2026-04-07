import { MigrationInterface, QueryRunner } from "typeorm";

export class AddSavedPosts1775461415765 implements MigrationInterface {
    name = 'AddSavedPosts1775461415765'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP INDEX "public"."IDX_posts_user_source_sourceId"`);
        await queryRunner.query(`CREATE TABLE "saved_posts" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "user_id" uuid NOT NULL, "post_id" uuid NOT NULL, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_868375ca4f041a2337a1c1a6634" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_78c961371a509e86d789714dd4" ON "saved_posts" ("user_id") `);
        await queryRunner.query(`CREATE UNIQUE INDEX "IDX_837a562f71fec3009c9af77ee5" ON "saved_posts" ("user_id", "post_id") `);
        await queryRunner.query(`ALTER TABLE "conversations" DROP COLUMN "difyConversationId"`);
        await queryRunner.query(`ALTER TABLE "conversations" ADD "difyConversationId" character varying`);
        await queryRunner.query(`ALTER TABLE "saved_posts" ADD CONSTRAINT "FK_78c961371a509e86d789714dd4f" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "saved_posts" ADD CONSTRAINT "FK_116e9df57f5221cc1a77c3d1cfe" FOREIGN KEY ("post_id") REFERENCES "posts"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "saved_posts" DROP CONSTRAINT "FK_116e9df57f5221cc1a77c3d1cfe"`);
        await queryRunner.query(`ALTER TABLE "saved_posts" DROP CONSTRAINT "FK_78c961371a509e86d789714dd4f"`);
        await queryRunner.query(`ALTER TABLE "conversations" DROP COLUMN "difyConversationId"`);
        await queryRunner.query(`ALTER TABLE "conversations" ADD "difyConversationId" character varying(255)`);
        await queryRunner.query(`DROP INDEX "public"."IDX_837a562f71fec3009c9af77ee5"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_78c961371a509e86d789714dd4"`);
        await queryRunner.query(`DROP TABLE "saved_posts"`);
        await queryRunner.query(`CREATE UNIQUE INDEX "IDX_posts_user_source_sourceId" ON "posts" ("source", "sourceId", "user_id") `);
    }

}
