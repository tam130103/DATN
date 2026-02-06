import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

export class AddAuthFieldsToUser1707259000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Add password column
    await queryRunner.addColumn(
      'users',
      new TableColumn({
        name: 'password',
        type: 'varchar',
        isNullable: true,
      }),
    );

    // Add provider column with enum
    await queryRunner.addColumn(
      'users',
      new TableColumn({
        name: 'provider',
        type: 'enum',
        enum: ['local', 'google'],
        default: "'local'",
      }),
    );

    // Add updatedAt column
    await queryRunner.addColumn(
      'users',
      new TableColumn({
        name: 'updatedAt',
        type: 'timestamp',
        default: 'now()',
      }),
    );

    // Update existing Google users to have provider='google'
    await queryRunner.query(
      `UPDATE "users" SET "provider" = 'google' WHERE "googleId" IS NOT NULL`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropColumn('users', 'password');
    await queryRunner.dropColumn('users', 'provider');
    await queryRunner.dropColumn('users', 'updatedAt');
  }
}
