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
} from '@nestjs/common';
import { UserService } from './user.service';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { UpdateNotificationDto } from './dto/update-notification.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@Controller('users')
@UseGuards(JwtAuthGuard)
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Get('me')
  getMe(@CurrentUser() user: any) {
    return this.userService.findById(user.id);
  }

  @Get(':username')
  async getByUsername(@Param('username') username: string, @CurrentUser() currentUser: any) {
    const user = await this.userService.findByUsername(username);
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
  follow(@CurrentUser() user: any, @Param('id') id: string) {
    return this.userService.follow(user.id, id);
  }

  @Delete(':id/follow')
  unfollow(@CurrentUser() user: any, @Param('id') id: string) {
    return this.userService.unfollow(user.id, id);
  }

  @Get(':id/followers')
  getFollowers(
    @Param('id') id: string,
    @Query('page', new ParseIntPipe({ optional: true })) page: number = 1,
    @Query('limit', new ParseIntPipe({ optional: true })) limit: number = 20,
  ) {
    return this.userService.getFollowers(id, page, limit);
  }

  @Get(':id/following')
  getFollowing(
    @Param('id') id: string,
    @Query('page', new ParseIntPipe({ optional: true })) page: number = 1,
    @Query('limit', new ParseIntPipe({ optional: true })) limit: number = 20,
  ) {
    return this.userService.getFollowing(id, page, limit);
  }
}
