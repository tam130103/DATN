import { NestFactory } from '@nestjs/core';
import { AppModule } from './src/app.module';
import { AdminService } from './src/modules/admin/admin.service';

async function bootstrap() {
  const app = await NestFactory.createApplicationContext(AppModule);
  const adminService = app.get(AdminService);
  
  try {
    const users = await adminService.getUsers({ page: 1, limit: 1 });
    const targetUserId = users.users[0]?.id;

    if (!targetUserId) process.exit(0);

    const comments = await adminService.getComments({ page: 1, limit: 1 });
    if (comments.comments.length > 0) {
      const commentId = comments.comments[0].id;
      console.log(`Trying to moderate comment ${commentId}`);
      await adminService.moderateComment(commentId, { status: 'hidden' as any, reason: 'test' }, targetUserId);
      console.log('Moderate comment success!');
    }

    const reports = await adminService.getReports({ page: 1, limit: 1 });
    if (reports.reports.length > 0) {
      const reportId = reports.reports[0].id;
      console.log(`Trying to review report ${reportId}`);
      await adminService.reviewReport(reportId, { status: 'resolved' as any }, targetUserId);
      console.log('Review report success!');
    }

  } catch (err: any) {
    console.error('Error occurred:', err.message);
    if (err.response) console.error('Response:', err.response);
  } finally {
    await app.close();
  }
}

bootstrap();
