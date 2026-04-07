import { NestFactory } from '@nestjs/core';
import { AppModule } from './src/app.module';
import { AdminService } from './src/modules/admin/admin.service';
import { JwtService } from '@nestjs/jwt';
import { UserService } from './src/modules/user/user.service';
import axios from 'axios';

async function bootstrap() {
  const app = await NestFactory.createApplicationContext(AppModule);
  const adminService = app.get(AdminService);
  const jwtService = app.get(JwtService);
  const userService = app.get(UserService);
  
  try {
    const pageData = await adminService.getUsers({ page: 1, limit: 100 });
    const adminUser = pageData.users.find(u => u.role === 'admin');
    
    if (!adminUser) {
      console.log('No admin user found!');
      process.exit(1);
    }
    
    console.log(`Found Admin User: ${adminUser.email}`);
    
    // Find another user to test on
    const targetUser = pageData.users.find(u => u.id !== adminUser.id);
    if (!targetUser) {
      console.log('No target user found for testing.');
      process.exit(1);
    }

    const token = jwtService.sign({ sub: adminUser.id, email: adminUser.email });
    
    console.log(`Sending HTTP PATCH to block target user ${targetUser.id}`);
    try {
      const res = await axios.patch(
        `http://localhost:3000/api/v1/admin/users/${targetUser.id}/status`, 
        { status: 'blocked', reason: 'test via http 2' }, 
        { headers: { Authorization: `Bearer ${token}` } }
      );
      console.log('HTTP Success:', res.data);
      
      // Revert status
      await axios.patch(
        `http://localhost:3000/api/v1/admin/users/${targetUser.id}/status`, 
        { status: 'active', reason: '' }, 
        { headers: { Authorization: `Bearer ${token}` } }
      );
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
