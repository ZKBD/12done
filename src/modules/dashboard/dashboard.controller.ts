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
import {
  DashboardQueryDto,
  LandlordDashboardResponseDto,
  CreateExpenseDto,
  UpdateExpenseDto,
  ExpenseQueryDto,
  ExpenseResponseDto,
  ExpenseListResponseDto,
} from './dto';

@ApiTags('dashboard')
@Controller('dashboard')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class DashboardController {
  constructor(
    private readonly dashboardService: DashboardService,
    private readonly expenseService: ExpenseService,
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
}
