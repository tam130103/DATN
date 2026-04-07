import { DataSource } from 'typeorm';
import { config } from 'dotenv';
config();

const myDataSource = new DataSource({
    type: 'postgres',
    host: process.env.DB_HOST,
    port: parseInt(process.env.DB_PORT),
    username: process.env.DB_USERNAME,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_DATABASE,
    ssl: { rejectUnauthorized: false },
});

myDataSource.initialize().then(async () => {
    const result = await myDataSource.query(`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = 'comments';
    `);
    console.log(result);
    process.exit(0);
}).catch(err => {
    console.error(err);
    process.exit(1);
});
