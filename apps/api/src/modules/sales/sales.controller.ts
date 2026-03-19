import {
    Controller,
    Get,
    Post,
    Put,
    Delete,
    Param,
    Body,
    Query,
    UseGuards,
    HttpCode,
    HttpStatus,
} from '@nestjs/common';
import { SalesService } from './sales.service';
import { CreateSalesSlipDto, UpdateSalesSlipDto } from './sales.dto';
import {
    JwtAuthGuard,
    RolesGuard,
    TenantGuard,
    Roles,
    CurrentUser,
    RequestUser,
} from '../../common';

@Controller('sales')
@UseGuards(JwtAuthGuard, RolesGuard, TenantGuard)
export class SalesController {
    constructor(private readonly salesService: SalesService) {}

    /**
     * POST /api/sales/slips
     * 伝票作成（Manager / Admin）
     */
    @Post('slips')
    @Roles('Manager', 'Admin', 'SystemAdmin')
    @HttpCode(HttpStatus.CREATED)
    async createSlip(
        @CurrentUser() user: RequestUser,
        @Body() dto: CreateSalesSlipDto,
    ) {
        return this.salesService.createSlip(user, dto);
    }

    /**
     * PUT /api/sales/slips/:id
     * 伝票更新（Manager / Admin、締め前のみ）
     */
    @Put('slips/:id')
    @Roles('Manager', 'Admin', 'SystemAdmin')
    async updateSlip(
        @CurrentUser() user: RequestUser,
        @Param('id') slipId: string,
        @Body() dto: UpdateSalesSlipDto,
    ) {
        return this.salesService.updateSlip(user, slipId, dto);
    }

    /**
     * GET /api/sales/slips
     * 伝票一覧（日付指定）
     */
    @Get('slips')
    @Roles('Manager', 'Admin', 'SystemAdmin')
    async listSlips(
        @CurrentUser() user: RequestUser,
        @Query('businessDate') businessDate?: string,
    ) {
        return this.salesService.listSlips(user, businessDate);
    }

    /**
     * GET /api/sales/slips/:id
     * 伝票詳細
     */
    @Get('slips/:id')
    @Roles('Manager', 'Admin', 'SystemAdmin')
    async getSlip(
        @CurrentUser() user: RequestUser,
        @Param('id') slipId: string,
    ) {
        return this.salesService.getSlip(user, slipId);
    }
}
