import { Module } from '@nestjs/common';
import { PaymentsController } from './payments.controller';
import { PaymentsService } from './payments.service';
import { SplitPaymentService } from './split-payment.service';
import { EscrowService } from './escrow.service';
import { DatabaseModule } from '@/database';
import { NotificationsModule } from '@/modules/notifications/notifications.module';
import { MailModule } from '@/mail';

@Module({
  imports: [DatabaseModule, NotificationsModule, MailModule],
  controllers: [PaymentsController],
  providers: [PaymentsService, SplitPaymentService, EscrowService],
  exports: [PaymentsService, SplitPaymentService, EscrowService],
})
export class PaymentsModule {}
