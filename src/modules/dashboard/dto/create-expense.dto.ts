import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsNumber,
  IsOptional,
  IsDateString,
  IsBoolean,
  IsEnum,
  Min,
} from 'class-validator';

export enum ExpenseCategoryEnum {
  MAINTENANCE = 'MAINTENANCE',
  INSURANCE = 'INSURANCE',
  TAXES = 'TAXES',
  UTILITIES = 'UTILITIES',
  MORTGAGE = 'MORTGAGE',
  MANAGEMENT_FEES = 'MANAGEMENT_FEES',
  LEGAL = 'LEGAL',
  ADVERTISING = 'ADVERTISING',
  SUPPLIES = 'SUPPLIES',
  TRAVEL = 'TRAVEL',
  OTHER = 'OTHER',
}

export class CreateExpenseDto {
  @ApiPropertyOptional({ description: 'Property ID (optional - for property-specific expenses)' })
  @IsOptional()
  @IsString()
  propertyId?: string;

  @ApiProperty({ enum: ExpenseCategoryEnum, description: 'Expense category' })
  @IsEnum(ExpenseCategoryEnum)
  category: ExpenseCategoryEnum;

  @ApiProperty({ description: 'Description of the expense' })
  @IsString()
  description: string;

  @ApiProperty({ description: 'Expense amount', minimum: 0 })
  @IsNumber()
  @Min(0)
  amount: number;

  @ApiPropertyOptional({ description: 'Currency code', default: 'EUR' })
  @IsOptional()
  @IsString()
  currency?: string;

  @ApiProperty({ description: 'Date of the expense (YYYY-MM-DD)' })
  @IsDateString()
  expenseDate: string;

  @ApiPropertyOptional({ description: 'URL to receipt image/document' })
  @IsOptional()
  @IsString()
  receiptUrl?: string;

  @ApiPropertyOptional({ description: 'Additional notes' })
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiPropertyOptional({ description: 'Is this a recurring expense?', default: false })
  @IsOptional()
  @IsBoolean()
  isRecurring?: boolean;

  @ApiPropertyOptional({ description: 'Recurring period: monthly, quarterly, annually' })
  @IsOptional()
  @IsString()
  recurringPeriod?: string;
}
