import { Global, Module } from '@nestjs/common';
import { PaymentsController } from './payments.controller';
import { PaymentsService } from './payments.service';
import { StripeService } from './stripe.service';
import { DatabaseModule } from '@/database';
import { NotificationsModule } from '@/modules/notifications/notifications.module';
import { MailModule } from '@/mail/mail.module';

@Global()
@Module({
  imports: [DatabaseModule, NotificationsModule, MailModule],
  controllers: [PaymentsController],
  providers: [PaymentsService, StripeService],
  exports: [PaymentsService, StripeService],
})
export class PaymentsModule {}
