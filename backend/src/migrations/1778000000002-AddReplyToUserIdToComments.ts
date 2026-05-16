import { MigrationInterface, QueryRunner, TableColumn, TableForeignKey } from 'typeorm';

export class AddReplyToUserIdToComments1778000000002 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    const hasColumn = await queryRunner.hasColumn('comments', 'reply_to_user_id');
    if (!hasColumn) {
      await queryRunner.addColumn(
        'comments',
        new TableColumn({
          name: 'reply_to_user_id',
          type: 'uuid',
          isNullable: true,
        }),
      );
    }

    const table = await queryRunner.getTable('comments');
    const hasForeignKey = table?.foreignKeys.some((fk) =>
      fk.columnNames.includes('reply_to_user_id'),
    );
    if (!hasForeignKey) {
      await queryRunner.createForeignKey(
        'comments',
        new TableForeignKey({
          columnNames: ['reply_to_user_id'],
          referencedColumnNames: ['id'],
          referencedTableName: 'users',
          onDelete: 'SET NULL',
        }),
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const table = await queryRunner.getTable('comments');
    if (table) {
      const foreignKey = table.foreignKeys.find(
        (fk) => fk.columnNames.indexOf('reply_to_user_id') !== -1,
      );
      if (foreignKey) {
        await queryRunner.dropForeignKey('comments', foreignKey);
      }
      const hasColumn = await queryRunner.hasColumn('comments', 'reply_to_user_id');
      if (hasColumn) {
        await queryRunner.dropColumn('comments', 'reply_to_user_id');
      }
    }
  }
}
