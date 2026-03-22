import { Module, forwardRef } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UserService } from './user.service';
import { UserController } from './user.controller';
import { User } from './entities/user.entity';
import { Follow } from './entities/follow.entity';
import { NotificationModule } from '../notification/notification.module';

@Module({
  imports: [ConfigModule, TypeOrmModule.forFeature([User, Follow]), forwardRef(() => NotificationModule)],
  controllers: [UserController],
  providers: [UserService],
  exports: [UserService, TypeOrmModule],
})
export class UserModule {}
