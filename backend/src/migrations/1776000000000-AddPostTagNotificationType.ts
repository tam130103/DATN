import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddPostTagNotificationType1776000000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Add POST_TAG value to the existing notifications_type_enum
    await queryRunner.query(
      `ALTER TYPE "notifications_type_enum" ADD VALUE IF NOT EXISTS 'POST_TAG'`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // PostgreSQL does not support removing enum values directly.
    // To rollback, you would need to recreate the enum type without POST_TAG.
    // This is intentionally left as a no-op for safety.
  }
}
