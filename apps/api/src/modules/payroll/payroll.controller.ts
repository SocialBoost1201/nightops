import {
    Controller,
    Get,
    Post,
    Query,
    Body,
    UseGuards,
    HttpCode,
    HttpStatus,
} from '@nestjs/common';
import { PayrollService } from './payroll.service';
import {
    JwtAuthGuard,
    RolesGuard,
    TenantGuard,
    Roles,
    CurrentUser,
    RequestUser,
} from '../../common';

@Controller('payroll')
@UseGuards(JwtAuthGuard, RolesGuard, TenantGuard)
export class PayrollController {
    constructor(private readonly payrollService: PayrollService) {}

    @Get('calculate')
    @Roles('Admin', 'SystemAdmin')
    async calculate(
        @CurrentUser() user: RequestUser,
        @Query('yearMonth') yearMonth: string,
    ) {
        return this.payrollService.calculate(user, yearMonth);
    }

    @Post('monthly-close')
    @Roles('Admin', 'SystemAdmin')
    @HttpCode(HttpStatus.OK)
    async monthlyClose(
        @CurrentUser() user: RequestUser,
        @Body('yearMonth') yearMonth: string,
    ) {
        return this.payrollService.monthlyClose(user, yearMonth);
    }
}
