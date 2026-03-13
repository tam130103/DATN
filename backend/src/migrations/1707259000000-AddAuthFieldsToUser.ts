import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

export class AddAuthFieldsToUser1707259000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    const hasPassword = await queryRunner.hasColumn('users', 'password');
    if (!hasPassword) {
      await queryRunner.addColumn(
        'users',
        new TableColumn({
          name: 'password',
          type: 'varchar',
          isNullable: true,
        }),
      );
    }

    const hasProvider = await queryRunner.hasColumn('users', 'provider');
    if (!hasProvider) {
      await queryRunner.addColumn(
        'users',
        new TableColumn({
          name: 'provider',
          type: 'enum',
          enum: ['local', 'google'],
          default: "'local'",
        }),
      );
    }

    const hasUpdatedAt = await queryRunner.hasColumn('users', 'updatedAt');
    if (!hasUpdatedAt) {
      await queryRunner.addColumn(
        'users',
        new TableColumn({
          name: 'updatedAt',
          type: 'timestamp',
          default: 'now()',
        }),
      );
    }

    if (!hasProvider) {
      await queryRunner.query(
        `UPDATE "users" SET "provider" = 'google' WHERE "googleId" IS NOT NULL`,
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const hasPassword = await queryRunner.hasColumn('users', 'password');
    if (hasPassword) {
      await queryRunner.dropColumn('users', 'password');
    }
    const hasProvider = await queryRunner.hasColumn('users', 'provider');
    if (hasProvider) {
      await queryRunner.dropColumn('users', 'provider');
    }
    const hasUpdatedAt = await queryRunner.hasColumn('users', 'updatedAt');
    if (hasUpdatedAt) {
      await queryRunner.dropColumn('users', 'updatedAt');
    }
  }
}
