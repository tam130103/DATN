import { MigrationInterface, QueryRunner, TableColumn, TableIndex } from 'typeorm';

export class AddPostSourceFields1765000000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    const hasSource = await queryRunner.hasColumn('posts', 'source');
    if (!hasSource) {
      await queryRunner.addColumn(
        'posts',
        new TableColumn({
          name: 'source',
          type: 'varchar',
          length: '50',
          isNullable: true,
        }),
      );
    }

    const hasSourceId = await queryRunner.hasColumn('posts', 'sourceId');
    if (!hasSourceId) {
      await queryRunner.addColumn(
        'posts',
        new TableColumn({
          name: 'sourceId',
          type: 'varchar',
          length: '100',
          isNullable: true,
        }),
      );
    }

    const indexName = 'IDX_posts_user_source_sourceId';
    const table = await queryRunner.getTable('posts');
    const hasIndex = table?.indices?.some((idx) => idx.name === indexName);
    if (!hasIndex) {
      await queryRunner.createIndex(
        'posts',
        new TableIndex({
          name: indexName,
          columnNames: ['userId', 'source', 'sourceId'],
          isUnique: true,
        }),
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const indexName = 'IDX_posts_user_source_sourceId';
    const table = await queryRunner.getTable('posts');
    const hasIndex = table?.indices?.some((idx) => idx.name === indexName);
    if (hasIndex) {
      await queryRunner.dropIndex('posts', indexName);
    }

    const hasSourceId = await queryRunner.hasColumn('posts', 'sourceId');
    if (hasSourceId) {
      await queryRunner.dropColumn('posts', 'sourceId');
    }

    const hasSource = await queryRunner.hasColumn('posts', 'source');
    if (hasSource) {
      await queryRunner.dropColumn('posts', 'source');
    }
  }
}
