require('dotenv').config({ path: '.env' });
const { DataSource } = require('typeorm');
const db = new DataSource({
  type: 'postgres',
  host: process.env.DB_HOST,
  port: parseInt(process.env.DB_PORT),
  username: process.env.DB_USERNAME,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_DATABASE,
  ssl: { rejectUnauthorized: false }
});
async function run() {
  await db.initialize();
  const res = await db.query("UPDATE users SET role = 'admin' WHERE email='tam@gmail.com'");
  console.log('Update result:', res);
  const verify = await db.query("SELECT email, role FROM users WHERE email='tam@gmail.com'");
  console.log('Verified:', verify);
  process.exit(0);
}
run();
