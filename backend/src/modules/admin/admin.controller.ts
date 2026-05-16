import {
  Controller,
  Get,
  Patch,
  Delete,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { RequestUser } from '../auth/decorators/current-user.decorator';
import { UserRole } from '../user/entities/user.entity';
import { AdminService } from './admin.service';
import { AdminUserQueryDto } from './dto/admin-user-query.dto';
import { UpdateUserStatusDto } from './dto/update-user-status.dto';
import { ModeratePostDto } from './dto/moderate-post.dto';
import { ModerateCommentDto } from './dto/moderate-comment.dto';
import { CreateReportDto } from './dto/create-report.dto';
import { ReviewReportDto, AdminContentQueryDto } from './dto/review-report.dto';
import { UpdateUserRoleDto } from './dto/update-user-role.dto';

interface AuthenticatedRequest extends Request {
  user: RequestUser;
}

@Controller('admin')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  // ─── Dashboard ───────────────────────────────────────────────────────────────

  @Get('dashboard')
  getDashboard() {
    return this.adminService.getDashboard();
  }

  // ─── User Management ─────────────────────────────────────────────────────────

  @Get('users')
  getUsers(@Query() query: AdminUserQueryDto) {
    return this.adminService.getUsers(query);
  }

  @Patch('users/:id/status')
  updateUserStatus(
    @Param('id') id: string,
    @Body() dto: UpdateUserStatusDto,
    @Request() req: AuthenticatedRequest,
  ) {
    return this.adminService.updateUserStatus(id, dto, req.user.id);
  }

  @Patch('users/:id/role')
  updateUserRole(
    @Param('id') id: string,
    @Body() dto: UpdateUserRoleDto,
    @Request() req: AuthenticatedRequest,
  ) {
    return this.adminService.updateUserRole(id, dto, req.user.id);
  }

  // ─── Post Moderation ─────────────────────────────────────────────────────────

  @Get('posts')
  getPosts(@Query() query: AdminContentQueryDto) {
    return this.adminService.getPosts(query);
  }

  @Patch('posts/:id/moderation')
  moderatePost(
    @Param('id') id: string,
    @Body() dto: ModeratePostDto,
    @Request() req: AuthenticatedRequest,
  ) {
    return this.adminService.moderatePost(id, dto, req.user.id);
  }

  @Delete('posts/:id')
  deletePost(@Param('id') id: string) {
    return this.adminService.deletePost(id);
  }

  // ─── Comment Moderation ───────────────────────────────────────────────────────

  @Get('comments')
  getComments(@Query() query: AdminContentQueryDto) {
    return this.adminService.getComments(query);
  }

  @Patch('comments/:id/moderation')
  moderateComment(
    @Param('id') id: string,
    @Body() dto: ModerateCommentDto,
    @Request() req: AuthenticatedRequest,
  ) {
    return this.adminService.moderateComment(id, dto, req.user.id);
  }

  @Delete('comments/:id')
  deleteComment(@Param('id') id: string) {
    return this.adminService.deleteComment(id);
  }

  // ─── Reports ─────────────────────────────────────────────────────────────────

  @Get('reports')
  getReports(@Query() query: AdminContentQueryDto) {
    return this.adminService.getReports(query);
  }

  @Patch('reports/:id/review')
  reviewReport(
    @Param('id') id: string,
    @Body() dto: ReviewReportDto,
    @Request() req: AuthenticatedRequest,
  ) {
    return this.adminService.reviewReport(id, dto, req.user.id);
  }

  // ─── Maintenance ────────────────────────────────────────────────────────────

  @Post('maintenance/recalculate-follows')
  recalculateFollows() {
    return this.adminService.recalculateFollowCounts();
  }
}

// ─── User-facing report endpoint ─────────────────────────────────────────────

@Controller('reports')
@UseGuards(JwtAuthGuard)
export class ReportController {
  constructor(private readonly adminService: AdminService) {}

  @Post()
  createReport(@Body() dto: CreateReportDto, @Request() req: AuthenticatedRequest) {
    return this.adminService.createReport(req.user.id, dto);
  }
}
