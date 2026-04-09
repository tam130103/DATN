const { Client } = require('pg');
require('dotenv').config();

const client = new Client({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  user: process.env.DB_USERNAME || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
  database: process.env.DB_DATABASE || 'datn_social',
});

async function main() {
  await client.connect();
  console.log('Connected to DB');

  try {
    await client.query(`ALTER TABLE "posts" ADD COLUMN IF NOT EXISTS "isPinned" boolean NOT NULL DEFAULT false;`);
    console.log('Added isPinned column');
    
    await client.query(`ALTER TABLE "posts" ADD COLUMN IF NOT EXISTS "isEdited" boolean NOT NULL DEFAULT false;`);
    console.log('Added isEdited column');
    
    await client.query(`ALTER TABLE "posts" ADD COLUMN IF NOT EXISTS "updatedAt" timestamptz NOT NULL DEFAULT now();`);
    console.log('Added updatedAt column');
    
  } catch (e) {
    console.error('Error:', e);
  } finally {
    await client.end();
  }
}

main();
