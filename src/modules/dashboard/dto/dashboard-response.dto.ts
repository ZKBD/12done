import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

// Property Summary for dashboard
export class DashboardPropertySummaryDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  title: string;

  @ApiProperty()
  address: string;

  @ApiProperty()
  city: string;

  @ApiProperty()
  status: string;

  @ApiPropertyOptional()
  primaryImageUrl?: string;

  @ApiPropertyOptional()
  currentTenant?: {
    id: string;
    firstName: string;
    lastName: string;
  };

  @ApiPropertyOptional()
  activeLeaseId?: string;

  @ApiProperty()
  pendingMaintenanceCount: number;
}

// Monthly Income Data Point
export class MonthlyIncomeDto {
  @ApiProperty({ description: 'Month in YYYY-MM format' })
  month: string;

  @ApiProperty()
  expectedIncome: number;

  @ApiProperty()
  actualIncome: number;

  @ApiProperty()
  currency: string;
}

// Expense Summary by Category
export class ExpenseSummaryDto {
  @ApiProperty()
  category: string;

  @ApiProperty()
  totalAmount: number;

  @ApiProperty()
  count: number;

  @ApiProperty()
  currency: string;
}

// Maintenance Summary for dashboard
export class MaintenanceSummaryDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  title: string;

  @ApiProperty()
  type: string;

  @ApiProperty()
  status: string;

  @ApiProperty()
  priority: string;

  @ApiProperty()
  propertyTitle: string;

  @ApiPropertyOptional()
  tenantName?: string;

  @ApiProperty()
  createdAt: Date;
}

// Conversation Summary for dashboard
export class ConversationSummaryDto {
  @ApiProperty()
  id: string;

  @ApiPropertyOptional()
  subject?: string;

  @ApiPropertyOptional()
  propertyTitle?: string;

  @ApiProperty()
  participantName: string;

  @ApiProperty()
  lastMessageAt: Date;

  @ApiProperty()
  unreadCount: number;
}

// Main Landlord Dashboard Response
export class LandlordDashboardResponseDto {
  // Overview stats
  @ApiProperty({ description: 'Total number of properties owned' })
  totalProperties: number;

  @ApiProperty({ description: 'Number of active leases' })
  activeLeases: number;

  @ApiProperty({ description: 'Number of properties without active leases' })
  vacantProperties: number;

  @ApiProperty({ description: 'Pending maintenance requests count' })
  pendingMaintenanceRequests: number;

  @ApiProperty({ description: 'Unread messages count' })
  unreadMessages: number;

  // Financial summary for period
  @ApiProperty({ description: 'Total expected income for the period' })
  totalExpectedIncome: number;

  @ApiProperty({ description: 'Total actual income received for the period' })
  totalActualIncome: number;

  @ApiProperty({ description: 'Total expenses for the period' })
  totalExpenses: number;

  @ApiProperty({ description: 'Net income (actual income - expenses)' })
  netIncome: number;

  @ApiProperty({ description: 'Currency for financial figures' })
  currency: string;

  // Properties with status
  @ApiProperty({ type: [DashboardPropertySummaryDto] })
  properties: DashboardPropertySummaryDto[];

  // Monthly income chart data (last 12 months)
  @ApiProperty({ type: [MonthlyIncomeDto] })
  monthlyIncome: MonthlyIncomeDto[];

  // Expenses by category
  @ApiProperty({ type: [ExpenseSummaryDto] })
  expensesByCategory: ExpenseSummaryDto[];

  // Recent maintenance requests (pending/in-progress)
  @ApiProperty({ type: [MaintenanceSummaryDto] })
  maintenanceRequests: MaintenanceSummaryDto[];

  // Recent conversations
  @ApiProperty({ type: [ConversationSummaryDto] })
  recentConversations: ConversationSummaryDto[];
}
