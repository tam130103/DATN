const { Client } = require('pg');
const fs = require('fs');
const c = new Client('postgres://postgres.sotrmljplojrefkgcpva:6XVuhniLMiydpvaV@aws-1-ap-southeast-1.pooler.supabase.com:6543/postgres?sslmode=require');
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
c.connect().then(() => c.query("SELECT table_name, column_name FROM information_schema.columns WHERE table_name IN ('users', 'posts', 'comments', 'reports');"))
  .then(res => {
     const cols = res.rows.map(r => `${r.table_name}.${r.column_name}`);
     fs.writeFileSync('db_schema.json', JSON.stringify(cols, null, 2), 'utf8');
     console.log('Done!');
  })
  .catch(err => console.error(err))
  .finally(() => c.end());
