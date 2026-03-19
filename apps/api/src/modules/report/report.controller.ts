import {
    Controller,
    Get,
    Query,
    UseGuards,
} from '@nestjs/common';
import { ReportService } from './report.service';
import {
    JwtAuthGuard,
    RolesGuard,
    TenantGuard,
    Roles,
    CurrentUser,
    RequestUser,
} from '../../common';

@Controller('reports')
@UseGuards(JwtAuthGuard, RolesGuard, TenantGuard)
export class ReportController {
    constructor(private readonly reportService: ReportService) {}

    @Get('daily')
    @Roles('Manager', 'Admin', 'SystemAdmin')
    async dailySummary(
        @CurrentUser() user: RequestUser,
        @Query('businessDate') businessDate: string,
    ) {
        return this.reportService.dailySummary(user, businessDate);
    }

    @Get('ranking/sales')
    @Roles('Manager', 'Admin', 'SystemAdmin')
    async castSalesRanking(
        @CurrentUser() user: RequestUser,
        @Query('from') from: string,
        @Query('to') to: string,
    ) {
        return this.reportService.castSalesRanking(user, from, to);
    }

    @Get('ranking/drinks')
    @Roles('Manager', 'Admin', 'SystemAdmin')
    async drinkRanking(
        @CurrentUser() user: RequestUser,
        @Query('from') from: string,
        @Query('to') to: string,
    ) {
        return this.reportService.drinkRanking(user, from, to);
    }

    @Get('ranking/nominations')
    @Roles('Manager', 'Admin', 'SystemAdmin')
    async nominationRanking(
        @CurrentUser() user: RequestUser,
        @Query('from') from: string,
        @Query('to') to: string,
    ) {
        return this.reportService.nominationRanking(user, from, to);
    }
}
