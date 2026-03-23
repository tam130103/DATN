import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

export class AddPostSourceCreatedAt1766000000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    const hasSourceCreatedAt = await queryRunner.hasColumn('posts', 'sourceCreatedAt');
    if (!hasSourceCreatedAt) {
      await queryRunner.addColumn(
        'posts',
        new TableColumn({
          name: 'sourceCreatedAt',
          type: 'timestamptz',
          isNullable: true,
        }),
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const hasSourceCreatedAt = await queryRunner.hasColumn('posts', 'sourceCreatedAt');
    if (hasSourceCreatedAt) {
      await queryRunner.dropColumn('posts', 'sourceCreatedAt');
    }
  }
}
