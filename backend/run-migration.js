const ds = require('./dist/config/data-source').default;
ds.initialize().then(async (d) => {
  await d.runMigrations();
  console.log('Migrations done');
  await d.destroy();
}).catch((e) => {
  console.error('Migration error:', e.message);
  process.exit(1);
});
