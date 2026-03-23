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
    const userIdColumn = table?.columns.find((column) => column.name === 'user_id' || column.name === 'userId')?.name;
    const hasIndex = table?.indices?.some((idx) => idx.name === indexName);
    const hasEquivalentIndex = table?.indices?.some(
      (idx) =>
        idx.isUnique &&
        idx.columnNames.join('|') === [userIdColumn, 'source', 'sourceId'].filter(Boolean).join('|'),
    );

    if (userIdColumn && !hasIndex && !hasEquivalentIndex) {
      await queryRunner.createIndex(
        'posts',
        new TableIndex({
          name: indexName,
          columnNames: [userIdColumn, 'source', 'sourceId'],
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
