const { Client } = require('pg');

const client = new Client({
  host: 'aws-1-ap-southeast-1.pooler.supabase.com',
  port: 6543,
  user: 'postgres.sotrmljplojrefkgcpva',
  password: '6XVuhniLMiydpvaV',
  database: 'postgres',
  ssl: { rejectUnauthorized: false }
});

async function run() {
  await client.connect();
  const res = await client.query('UPDATE "users" SET "notificationEnabled" = true;');
  console.log('Updated rows:', res.rowCount);
  await client.end();
}

run().catch(console.error);
