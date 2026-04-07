import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

export class AddDifyConversationIdToConversations1767000000000
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    const hasColumn = await queryRunner.hasColumn(
      'conversations',
      'difyConversationId',
    );

    if (!hasColumn) {
      await queryRunner.addColumn(
        'conversations',
        new TableColumn({
          name: 'difyConversationId',
          type: 'varchar',
          isNullable: true,
        }),
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const hasColumn = await queryRunner.hasColumn(
      'conversations',
      'difyConversationId',
    );

    if (hasColumn) {
      await queryRunner.dropColumn('conversations', 'difyConversationId');
    }
  }
}
