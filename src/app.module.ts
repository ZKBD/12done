import { Module } from '@nestjs/common';
import { ThrottlerModule } from '@nestjs/throttler';
import { ScheduleModule } from '@nestjs/schedule';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AppConfigModule } from './config';
import { DatabaseModule } from './database';
import { AppCacheModule } from './cache';
import { MailModule } from './mail';
import { AuthModule } from './modules/auth';
import { UsersModule } from './modules/users';
import { InvitationsModule } from './modules/invitations';
import { PropertiesModule } from './modules/properties';
import { SearchModule } from './modules/search';
import { NotificationsModule } from './modules/notifications';
import { NegotiationsModule } from './modules/negotiations';
import { CountriesModule } from './modules/countries';
import { HealthModule } from './modules/health';
import { PaymentsModule } from './modules/payments';
import { MessagingModule } from './modules/messaging/messaging.module';
import { ServiceProvidersModule } from './modules/service-providers';
import { ApplicationsModule } from './modules/applications';
import { LeasesModule } from './modules/leases';
import { MaintenanceModule } from './modules/maintenance/maintenance.module';
import { DashboardModule } from './modules/dashboard';
import { TourGuideModule } from './modules/tour-guide';
import { VerificationModule } from './modules/verification';

@Module({
  imports: [
    // Configuration with validation
    AppConfigModule,

    // Scheduling (for cron jobs)
    ScheduleModule.forRoot(),

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
    PropertiesModule,
    SearchModule,
    NotificationsModule,
    NegotiationsModule,
    CountriesModule,
    HealthModule,
    PaymentsModule,
    MessagingModule,
    ServiceProvidersModule,
    ApplicationsModule,
    LeasesModule,
    MaintenanceModule,
    DashboardModule,
    TourGuideModule,
    VerificationModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
