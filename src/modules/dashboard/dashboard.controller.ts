import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  HttpStatus,
  HttpCode,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '@/modules/auth/guards';
import { CurrentUser, CurrentUserData } from '@/common/decorators';
import { DashboardService } from './dashboard.service';
import { ExpenseService } from './expense.service';
import { TenantDashboardService } from './tenant-dashboard.service';
import { TenantDocumentService } from './tenant-document.service';
import {
  DashboardQueryDto,
  LandlordDashboardResponseDto,
  CreateExpenseDto,
  UpdateExpenseDto,
  ExpenseQueryDto,
  ExpenseResponseDto,
  ExpenseListResponseDto,
  TenantDashboardQueryDto,
  TenantDashboardResponseDto,
  CreateTenantDocumentDto,
  TenantDocumentQueryDto,
  TenantDocumentResponseDto,
  TenantDocumentListResponseDto,
} from './dto';

@ApiTags('dashboard')
@Controller('dashboard')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class DashboardController {
  constructor(
    private readonly dashboardService: DashboardService,
    private readonly expenseService: ExpenseService,
    private readonly tenantDashboardService: TenantDashboardService,
    private readonly tenantDocumentService: TenantDocumentService,
  ) {}

  // ============================================
  // LANDLORD DASHBOARD (PROD-100.1)
  // ============================================

  @Get('landlord')
  @ApiOperation({
    summary: 'Get landlord dashboard (PROD-100.1)',
    description:
      'Aggregated dashboard data for landlord including properties, income, expenses, maintenance, and messages',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Dashboard data retrieved successfully',
    type: LandlordDashboardResponseDto,
  })
  async getLandlordDashboard(
    @CurrentUser() user: CurrentUserData,
    @Query() query: DashboardQueryDto,
  ): Promise<LandlordDashboardResponseDto> {
    return this.dashboardService.getLandlordDashboard(user.id, query);
  }

  // ============================================
  // EXPENSE MANAGEMENT (PROD-100.4)
  // ============================================

  @Post('expenses')
  @ApiOperation({
    summary: 'Create expense (PROD-100.4)',
    description: 'Add a new expense for tracking',
  })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Expense created successfully',
    type: ExpenseResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Property not found',
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'Property not owned by user',
  })
  async createExpense(
    @CurrentUser() user: CurrentUserData,
    @Body() dto: CreateExpenseDto,
  ): Promise<ExpenseResponseDto> {
    return this.expenseService.create(user.id, dto);
  }

  @Get('expenses')
  @ApiOperation({
    summary: 'Get expenses (PROD-100.4)',
    description: 'List all expenses with optional filtering by property, category, and date range',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'List of expenses',
    type: ExpenseListResponseDto,
  })
  async getExpenses(
    @CurrentUser() user: CurrentUserData,
    @Query() query: ExpenseQueryDto,
  ): Promise<ExpenseListResponseDto> {
    return this.expenseService.findAll(user.id, query);
  }

  @Get('expenses/:id')
  @ApiOperation({ summary: 'Get expense by ID' })
  @ApiParam({ name: 'id', description: 'Expense UUID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Expense details',
    type: ExpenseResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Expense not found',
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'Not authorized to view this expense',
  })
  async getExpense(
    @Param('id') id: string,
    @CurrentUser() user: CurrentUserData,
  ): Promise<ExpenseResponseDto> {
    return this.expenseService.findOne(id, user.id);
  }

  @Patch('expenses/:id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Update expense' })
  @ApiParam({ name: 'id', description: 'Expense UUID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Expense updated successfully',
    type: ExpenseResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Expense not found',
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'Not authorized to update this expense',
  })
  async updateExpense(
    @Param('id') id: string,
    @CurrentUser() user: CurrentUserData,
    @Body() dto: UpdateExpenseDto,
  ): Promise<ExpenseResponseDto> {
    return this.expenseService.update(id, user.id, dto);
  }

  @Delete('expenses/:id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete expense' })
  @ApiParam({ name: 'id', description: 'Expense UUID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Expense deleted successfully',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Expense not found',
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'Not authorized to delete this expense',
  })
  async deleteExpense(
    @Param('id') id: string,
    @CurrentUser() user: CurrentUserData,
  ): Promise<{ message: string }> {
    return this.expenseService.delete(id, user.id);
  }

  // ============================================
  // TENANT DASHBOARD (PROD-106.1)
  // ============================================

  @Get('tenant')
  @ApiOperation({
    summary: 'Get tenant dashboard (PROD-106.1)',
    description:
      'Aggregated dashboard data for tenant including leases, payments, maintenance requests, and documents',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Dashboard data retrieved successfully',
    type: TenantDashboardResponseDto,
  })
  async getTenantDashboard(
    @CurrentUser() user: CurrentUserData,
    @Query() query: TenantDashboardQueryDto,
  ): Promise<TenantDashboardResponseDto> {
    return this.tenantDashboardService.getTenantDashboard(user.id, query);
  }

  // ============================================
  // TENANT DOCUMENTS (PROD-106.7)
  // ============================================

  @Post('tenant/documents')
  @ApiOperation({
    summary: 'Upload tenant document (PROD-106.7)',
    description: 'Add a document reference to a lease',
  })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Document created successfully',
    type: TenantDocumentResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Lease not found',
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'Not authorized to add documents to this lease',
  })
  async createDocument(
    @CurrentUser() user: CurrentUserData,
    @Body() dto: CreateTenantDocumentDto,
  ): Promise<TenantDocumentResponseDto> {
    return this.tenantDocumentService.create(user.id, dto);
  }

  @Get('tenant/documents')
  @ApiOperation({
    summary: 'List tenant documents (PROD-106.7)',
    description: 'List all documents accessible to the tenant with optional filtering',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'List of documents',
    type: TenantDocumentListResponseDto,
  })
  async getDocuments(
    @CurrentUser() user: CurrentUserData,
    @Query() query: TenantDocumentQueryDto,
  ): Promise<TenantDocumentListResponseDto> {
    return this.tenantDocumentService.findAll(user.id, query);
  }

  @Get('tenant/documents/:id')
  @ApiOperation({ summary: 'Get document by ID' })
  @ApiParam({ name: 'id', description: 'Document UUID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Document details',
    type: TenantDocumentResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Document not found',
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'Not authorized to view this document',
  })
  async getDocument(
    @Param('id') id: string,
    @CurrentUser() user: CurrentUserData,
  ): Promise<TenantDocumentResponseDto> {
    return this.tenantDocumentService.findOne(id, user.id);
  }

  @Delete('tenant/documents/:id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete document' })
  @ApiParam({ name: 'id', description: 'Document UUID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Document deleted successfully',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Document not found',
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'Not authorized to delete this document',
  })
  async deleteDocument(
    @Param('id') id: string,
    @CurrentUser() user: CurrentUserData,
  ): Promise<{ message: string }> {
    return this.tenantDocumentService.delete(id, user.id);
  }
}
