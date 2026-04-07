const { Client } = require('pg');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '.env') });

const client = new Client({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  user: process.env.DB_USERNAME,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_DATABASE,
  ssl: { rejectUnauthorized: false }
});

async function run() {
  await client.connect();
  
  // Get users
  const res = await client.query('SELECT id, email, role FROM users LIMIT 5');
  console.log('Users found:', res.rows);
  
  if (res.rows.length > 0) {
    const adminEmail = res.rows[0].email;
    await client.query("UPDATE users SET role = 'admin' WHERE email = $1", [adminEmail]);
    console.log(`Successfully elevated ${adminEmail} to admin.`);
  } else {
    console.log('No users found in database.');
  }

  await client.end();
}

run().catch(console.error);
