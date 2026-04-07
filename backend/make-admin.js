const { DataSource } = require('typeorm');
const db = new DataSource({
  type: 'postgres',
  url: 'postgresql://postgres:postgres@localhost:5432/datn_social',
  synchronize: false,
});
async function run() {
  await db.initialize();
  const res = await db.query("UPDATE users SET role = 'admin'");
  console.log('Updated users count:', res[1]);
  process.exit(0);
}
run();
