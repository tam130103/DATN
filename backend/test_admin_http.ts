import { NestFactory } from '@nestjs/core';
import { AppModule } from './src/app.module';
import { AdminService } from './src/modules/admin/admin.service';
import { JwtService } from '@nestjs/jwt';
import axios from 'axios';

async function bootstrap() {
  const app = await NestFactory.createApplicationContext(AppModule);
  const adminService = app.get(AdminService);
  const jwtService = app.get(JwtService);
  
  try {
    const users = await adminService.getUsers({ page: 1, limit: 1 });
    if (users.users.length === 0) {
      console.log('No users found.');
      process.exit(0);
    }
    const targetUserId = users.users[0].id;
    
    // Create an admin token
    const token = jwtService.sign({ sub: targetUserId, email: 'fakeadmin@test.com' });
    console.log(`Generated token: ${token}`);

    // Call the running backend (assuming it's on 3000)
    console.log(`Sending HTTP PATCH to http://localhost:3000/api/v1/admin/users/${targetUserId}/status`);
    try {
      const res = await axios.patch(`http://localhost:3000/api/v1/admin/users/${targetUserId}/status`, { status: 'blocked', reason: 'test via http' }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      console.log('HTTP Success:', res.data);
    } catch (err: any) {
      console.error('HTTP Error response:', err.response?.data || err.message);
    }

  } catch (err) {
    console.error('Error occurred:', err.message);
  } finally {
    await app.close();
  }
}

bootstrap();
