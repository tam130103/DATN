import { MigrationInterface, QueryRunner } from 'typeorm';

export class AlignChatIdTypes1763000000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      'ALTER TABLE "conversation_members" ALTER COLUMN "conversationId" TYPE uuid USING "conversationId"::uuid',
    );
    await queryRunner.query(
      'ALTER TABLE "conversation_members" ALTER COLUMN "userId" TYPE uuid USING "userId"::uuid',
    );
    await queryRunner.query(
      'ALTER TABLE "messages" ALTER COLUMN "conversationId" TYPE uuid USING "conversationId"::uuid',
    );
    await queryRunner.query(
      'ALTER TABLE "messages" ALTER COLUMN "senderId" TYPE uuid USING "senderId"::uuid',
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      'ALTER TABLE "messages" ALTER COLUMN "senderId" TYPE varchar USING "senderId"::varchar',
    );
    await queryRunner.query(
      'ALTER TABLE "messages" ALTER COLUMN "conversationId" TYPE varchar USING "conversationId"::varchar',
    );
    await queryRunner.query(
      'ALTER TABLE "conversation_members" ALTER COLUMN "userId" TYPE varchar USING "userId"::varchar',
    );
    await queryRunner.query(
      'ALTER TABLE "conversation_members" ALTER COLUMN "conversationId" TYPE varchar USING "conversationId"::varchar',
    );
  }
}
