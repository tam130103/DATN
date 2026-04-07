import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from './modules/auth/auth.module';
import { UserModule } from './modules/user/user.module';
import { PostModule } from './modules/post/post.module';
import { EngagementModule } from './modules/engagement/engagement.module';
import { ChatModule } from './modules/chat/chat.module';
import { NotificationModule } from './modules/notification/notification.module';
import { SearchModule } from './modules/search/search.module';
import { CloudinaryModule } from './modules/cloudinary/cloudinary.module';
import { AIModule } from './modules/ai/ai.module';
import { AiToolsModule } from './modules/ai-tools/ai-tools.module';
import { AdminModule } from './modules/admin/admin.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        type: 'postgres',
        host: configService.get('DB_HOST', 'localhost'),
        port: configService.get<number>('DB_PORT', 5432),
        username: configService.get('DB_USERNAME', 'postgres'),
        password: configService.get('DB_PASSWORD', 'postgres'),
        database: configService.get('DB_DATABASE', 'datn_social'),
        entities: [__dirname + '/**/*.entity{.ts,.js}'],
        synchronize: false, // Disable auto-sync for safety in production
        logging: configService.get('DATABASE_LOGGING') === 'true',
      }),
    }),
    AuthModule,
    UserModule,
    PostModule,
    EngagementModule,
    ChatModule,
    NotificationModule,
    SearchModule,
    CloudinaryModule,
    AIModule,
    AiToolsModule,
    AdminModule,
  ],
})
export class AppModule {}
