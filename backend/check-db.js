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
  const res = await db.query("SELECT * FROM users WHERE email='tam@gmail.com'");
  console.log('User Role from DB:', res[0].role);
  process.exit(0);
}
run();
