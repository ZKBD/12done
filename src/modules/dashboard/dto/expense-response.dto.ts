import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ExpensePropertySummaryDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  title: string;

  @ApiProperty()
  address: string;
}

export class ExpenseResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  landlordId: string;

  @ApiPropertyOptional()
  propertyId?: string;

  @ApiProperty()
  category: string;

  @ApiProperty()
  description: string;

  @ApiProperty()
  amount: number;

  @ApiProperty()
  currency: string;

  @ApiProperty()
  expenseDate: Date;

  @ApiPropertyOptional()
  receiptUrl?: string;

  @ApiPropertyOptional()
  notes?: string;

  @ApiProperty()
  isRecurring: boolean;

  @ApiPropertyOptional()
  recurringPeriod?: string;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;

  @ApiPropertyOptional({ type: ExpensePropertySummaryDto })
  property?: ExpensePropertySummaryDto;
}

export class ExpenseListResponseDto {
  @ApiProperty({ type: [ExpenseResponseDto] })
  data: ExpenseResponseDto[];

  @ApiProperty()
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}
