import { NestFactory } from '@nestjs/core';
import { AppModule } from './src/app.module';
import { AdminService } from './src/modules/admin/admin.service';

async function bootstrap() {
  const app = await NestFactory.createApplicationContext(AppModule);
  const adminService = app.get(AdminService);
  
  try {
    // We just need any valid user ID. Let's find one.
    const users = await adminService.getUsers({ page: 1, limit: 1 });
    if (users.users.length === 0) {
      console.log('No users found.');
      process.exit(0);
    }
    const targetUserId = users.users[0].id;
    console.log(`Trying to update status for user ${targetUserId}`);

    // Update status to verify if it throws
    await adminService.updateUserStatus(targetUserId, { status: 'blocked' as any, reason: 'test' }, targetUserId);
    console.log('Update status success!');
    
    // Switch back
    await adminService.updateUserStatus(targetUserId, { status: 'active' as any, reason: '' }, targetUserId);

    // Try a post
    const posts = await adminService.getPosts({ page: 1, limit: 1 });
    if (posts.posts.length > 0) {
      const postId = posts.posts[0].id;
      console.log(`Trying to moderate post ${postId}`);
      await adminService.moderatePost(postId, { status: 'hidden' as any, reason: 'test' }, targetUserId);
      console.log('Moderate post success!');
      await adminService.moderatePost(postId, { status: 'visible' as any, reason: '' }, targetUserId);
    }

  } catch (err) {
    console.error('Error occurred:', err.message);
    if (err.response) console.error('Response:', err.response);
    if (err.stack) console.error(err.stack);
  } finally {
    await app.close();
  }
}

bootstrap();
