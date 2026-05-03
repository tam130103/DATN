import { MigrationInterface, QueryRunner } from 'typeorm';

export class AssignUsernames1778000000001 implements MigrationInterface {
  name = 'AssignUsernames1778000000001';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      UPDATE "users"
      SET username = 
        CASE 
          WHEN name IS NOT NULL AND name != '' THEN 
            LOWER(REGEXP_REPLACE(name, '[^a-zA-Z0-9]', '', 'g')) || '_' || substr(md5(random()::text), 1, 4)
          ELSE 
            LOWER(REGEXP_REPLACE(split_part(email, '@', 1), '[^a-zA-Z0-9]', '', 'g')) || '_' || substr(md5(random()::text), 1, 4)
        END
      WHERE username IS NULL OR username = '';
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Cannot reliably revert this operation without dropping valid usernames
  }
}
