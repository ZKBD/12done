import { Module } from '@nestjs/common';
import { ThrottlerModule } from '@nestjs/throttler';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AppConfigModule } from './config';
import { DatabaseModule } from './database';
import { AppCacheModule } from './cache';
import { MailModule } from './mail';
import { AuthModule } from './modules/auth';
import { UsersModule } from './modules/users';
import { InvitationsModule } from './modules/invitations';

@Module({
  imports: [
    // Configuration with validation
    AppConfigModule,

    // Rate limiting
    ThrottlerModule.forRoot([
      {
        name: 'short',
        ttl: 1000,
        limit: 3,
      },
      {
        name: 'medium',
        ttl: 10000,
        limit: 20,
      },
      {
        name: 'long',
        ttl: 60000,
        limit: 100,
      },
    ]),

    // Core infrastructure modules
    DatabaseModule,
    AppCacheModule,
    MailModule,

    // Feature modules
    AuthModule,
    UsersModule,
    InvitationsModule,

    // Feature modules will be added here as we implement them:
    // PropertiesModule,
    // SearchModule,
    // FavoritesModule,
    // NotificationsModule,
    // CountriesModule,
    // HealthModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
