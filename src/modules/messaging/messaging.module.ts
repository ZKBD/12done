import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MessagingController } from './messaging.controller';
import { MessagingService } from './messaging.service';
import { MessagingGateway } from './messaging.gateway';
import { WsJwtGuard } from './guards/ws-jwt.guard';
import { NotificationsModule } from '@/modules/notifications';

@Module({
  imports: [
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        secret: configService.get<string>('jwt.secret'),
        signOptions: {
          expiresIn: configService.get<string>('jwt.expiresIn') || '15m',
        },
      }),
    }),
    NotificationsModule,
  ],
  controllers: [MessagingController],
  providers: [
    MessagingService,
    {
      provide: 'MessagingGateway',
      useClass: MessagingGateway,
    },
    WsJwtGuard,
  ],
  exports: [MessagingService, 'MessagingGateway'],
})
export class MessagingModule {}
