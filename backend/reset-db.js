const { Client } = require('pg');

async function resetDatabase() {
  const client = new Client({
    host: 'localhost',
    port: 5432,
    user: 'postgres',
    password: 'tam130103', // Database password from .env
    database: 'postgres', // Connect to default database
  });

  try {
    await client.connect();
    console.log('Connected to PostgreSQL');

    // Terminate all connections to datn_social
    await client.query(`
      SELECT pg_terminate_backend(pg_stat_activity.pid)
      FROM pg_stat_activity
      WHERE pg_stat_activity.datname = 'datn_social'
      AND pid <> pg_backend_pid();
    `);
    console.log('Terminated active connections');

    // Drop database
    await client.query('DROP DATABASE IF EXISTS datn_social');
    console.log('Database dropped');

    // Create database
    await client.query('CREATE DATABASE datn_social');
    console.log('Database created');

    console.log('✅ Reset complete! Now run: npm run start:dev');
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await client.end();
  }
}

resetDatabase();
