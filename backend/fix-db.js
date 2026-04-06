const { Client } = require('pg');

const client = new Client({
  connectionString: 'postgres://postgres.sotrmljplojrefkgcpva:6XVuhniLMiydpvaV@aws-1-ap-southeast-1.pooler.supabase.com:6543/postgres'
});

async function run() {
  try {
    await client.connect();
    await client.query('ALTER TABLE conversations ADD COLUMN IF NOT EXISTS "difyConversationId" varchar(255)');
    console.log('Success altering table');
  } catch (err) {
    console.error('Error altering table', err);
  } finally {
    await client.end();
  }
}

run();
