import { Module } from '@nestjs/common';
import { DatabaseModule } from '@/database/database.module';
import {
  InsuranceProviderService,
  MortgageProviderService,
  ProviderInquiryService,
} from './services';
import {
  InsuranceProviderController,
  MortgageProviderController,
  ProviderInquiryController,
} from './platform-services.controller';

@Module({
  imports: [DatabaseModule],
  controllers: [
    InsuranceProviderController,
    MortgageProviderController,
    ProviderInquiryController,
  ],
  providers: [
    InsuranceProviderService,
    MortgageProviderService,
    ProviderInquiryService,
  ],
  exports: [
    InsuranceProviderService,
    MortgageProviderService,
    ProviderInquiryService,
  ],
})
export class PlatformServicesModule {}
