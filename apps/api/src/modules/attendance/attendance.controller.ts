import {
    Controller,
    Get,
    Post,
    Body,
    Query,
    UseGuards,
    HttpCode,
    HttpStatus,
} from '@nestjs/common';
import { AttendanceService } from './attendance.service';
import {
    CheckinDto,
    CheckoutDto,
    CastCheckoutDto,
    DailyCloseDto,
} from './attendance.dto';
import {
    JwtAuthGuard,
    RolesGuard,
    TenantGuard,
    Roles,
    CurrentUser,
    RequestUser,
} from '../../common';

@Controller()
@UseGuards(JwtAuthGuard, RolesGuard, TenantGuard)
export class AttendanceController {
    constructor(private readonly attendanceService: AttendanceService) {}

    /**
     * POST /api/punches/checkin
     * 出勤打刻（Cast / Staff）
     */
    @Post('punches/checkin')
    @Roles('Cast', 'Staff', 'Manager', 'Admin', 'SystemAdmin')
    @HttpCode(HttpStatus.CREATED)
    async checkin(
        @CurrentUser() user: RequestUser,
        @Body() dto: CheckinDto,
    ) {
        return this.attendanceService.checkin(user, dto);
    }

    /**
     * POST /api/punches/checkout
     * 退勤打刻（Staff のみ）
     */
    @Post('punches/checkout')
    @Roles('Staff', 'Manager', 'Admin', 'SystemAdmin')
    @HttpCode(HttpStatus.CREATED)
    async checkout(
        @CurrentUser() user: RequestUser,
        @Body() dto: CheckoutDto,
    ) {
        return this.attendanceService.checkout(user, dto);
    }

    /**
     * POST /api/cast-checkouts/set
     * キャストあがり入力（Manager / Admin）
     */
    @Post('cast-checkouts/set')
    @Roles('Manager', 'Admin', 'SystemAdmin')
    @HttpCode(HttpStatus.CREATED)
    async setCastCheckout(
        @CurrentUser() user: RequestUser,
        @Body() dto: CastCheckoutDto,
    ) {
        return this.attendanceService.setCastCheckout(user, dto);
    }

    /**
     * GET /api/punches/today
     * 当日の打刻状況一覧（Manager 向け）
     */
    @Get('punches/today')
    @Roles('Manager', 'Admin', 'SystemAdmin')
    async getTodayStatus(
        @CurrentUser() user: RequestUser,
        @Query('businessDate') businessDate: string,
    ) {
        return this.attendanceService.getTodayStatus(user, businessDate);
    }

    /**
     * POST /api/close/daily
     * 日次締め（Manager / Admin）
     */
    @Post('close/daily')
    @Roles('Manager', 'Admin', 'SystemAdmin')
    @HttpCode(HttpStatus.OK)
    async dailyClose(
        @CurrentUser() user: RequestUser,
        @Body() dto: DailyCloseDto,
    ) {
        return this.attendanceService.dailyClose(user, dto);
    }

    /**
     * GET /api/close/daily/status
     * 日次締め状況確認（Manager / Admin）
     */
    @Get('close/daily/status')
    @Roles('Manager', 'Admin', 'SystemAdmin')
    async getDailyCloseStatus(
        @CurrentUser() user: RequestUser,
        @Query('businessDate') businessDate: string,
    ) {
        return this.attendanceService.getDailyCloseStatus(user, businessDate);
    }
}
