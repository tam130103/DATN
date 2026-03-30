const { Client } = require('pg');

const client = new Client({
  connectionString: 'postgresql://postgres.sotrmljplojrefkgcpva:6XVuhniLMiydpvaV@aws-1-ap-southeast-1.pooler.supabase.com:6543/postgres'
});

async function run() {
  try {
    await client.connect();
    const res = await client.query('SELECT id, length(caption), caption FROM posts WHERE source = \'facebook\' ORDER BY "createdAt" DESC LIMIT 3');
    console.log(JSON.stringify(res.rows, null, 2));
  } catch(e) {
    console.error(e);
  } finally {
    await client.end();
  }
}
run();
