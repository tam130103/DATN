import {
  Controller,
  Get,
  Post,
  Delete,
  Patch,
  Param,
  Body,
  Query,
  UseGuards,
  ParseIntPipe,
  UseInterceptors,
  UploadedFile,
  Req,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Request } from 'express';
import { UserService } from './user.service';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { UpdateNotificationDto } from './dto/update-notification.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { NotificationService } from '../notification/notification.service';
import { NotificationGateway } from '../notification/notification.gateway';
import { CloudinaryService } from '../cloudinary/cloudinary.service';

const isUuid = (value: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);

@Controller('users')
@UseGuards(JwtAuthGuard)
export class UserController {
  constructor(
    private readonly userService: UserService,
    private readonly notificationService: NotificationService,
    private readonly notificationGateway: NotificationGateway,
    private readonly cloudinaryService: CloudinaryService,
  ) {}

  @Get('me')
  getMe(@CurrentUser() user: any) {
    return this.userService.findById(user.id);
  }

  @Post('me/avatar')
  @UseInterceptors(
    FileInterceptor('file', {
      limits: { fileSize: 5 * 1024 * 1024 },
    }),
  )
  async uploadAvatar(@UploadedFile() file: any) {
    if (!file) {
      throw new BadRequestException('File is required');
    }

    if (!file.mimetype.startsWith('image/')) {
      throw new BadRequestException('Only image files are allowed');
    }

    const result = await this.cloudinaryService.uploadFile(file, 'datn-social/avatars');
    return { url: result.secure_url };
  }

  @Get(':id/followers')
  getFollowers(
    @Param('id') id: string,
    @CurrentUser() currentUser: any,
    @Query('page', new ParseIntPipe({ optional: true })) page: number = 1,
    @Query('limit', new ParseIntPipe({ optional: true })) limit: number = 20,
  ) {
    return this.userService.getFollowers(id, page, limit, currentUser.id);
  }

  @Get(':id/following')
  getFollowing(
    @Param('id') id: string,
    @CurrentUser() currentUser: any,
    @Query('page', new ParseIntPipe({ optional: true })) page: number = 1,
    @Query('limit', new ParseIntPipe({ optional: true })) limit: number = 20,
  ) {
    return this.userService.getFollowing(id, page, limit, currentUser.id);
  }

  @Get(':username')
  async getByUsername(@Param('username') username: string, @CurrentUser() currentUser: any) {
    let user = await this.userService.findByUsername(username);

    if (!user && isUuid(username)) {
      try {
        user = await this.userService.findById(username);
      } catch {
        user = null;
      }
    }

    if (!user) {
      return null;
    }

    const isFollowing = await this.userService.isFollowing(currentUser.id, user.id);
    return { ...user, isFollowing };
  }

  @Patch('me')
  updateProfile(@CurrentUser() user: any, @Body() updateProfileDto: UpdateProfileDto) {
    return this.userService.update(user.id, updateProfileDto);
  }

  @Patch('me/notification')
  updateNotificationSettings(@CurrentUser() user: any, @Body() dto: UpdateNotificationDto) {
    return this.userService.updateNotificationSettings(user.id, dto.notificationEnabled);
  }

  @Post(':id/follow')
  async follow(@CurrentUser() user: any, @Param('id') id: string) {
    await this.userService.follow(user.id, id);
    const notification = await this.notificationService.createFollowNotification(user.id, id);
    if (notification) {
      this.notificationGateway.emitToUser(id, 'notification', notification);
    }
    return { success: true };
  }

  @Delete(':id/follow')
  unfollow(@CurrentUser() user: any, @Param('id') id: string) {
    return this.userService.unfollow(user.id, id);
  }
}
