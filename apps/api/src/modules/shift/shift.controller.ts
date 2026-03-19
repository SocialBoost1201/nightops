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
import { ShiftService } from './shift.service';
import { SubmitShiftsDto, ApproveShiftsDto, ShiftChangeRequestDto } from './shift.dto';
import {
    JwtAuthGuard,
    RolesGuard,
    TenantGuard,
    Roles,
    CurrentUser,
    RequestUser,
} from '../../common';

@Controller('shifts')
@UseGuards(JwtAuthGuard, RolesGuard, TenantGuard)
export class ShiftController {
    constructor(private readonly shiftService: ShiftService) {}

    /**
     * POST /api/shifts/submit
     * シフト2週間分を一括提出（Cast / Staff）
     */
    @Post('submit')
    @Roles('Cast', 'Staff', 'Manager', 'Admin', 'SystemAdmin')
    @HttpCode(HttpStatus.CREATED)
    async submit(
        @CurrentUser() user: RequestUser,
        @Body() dto: SubmitShiftsDto,
    ) {
        return this.shiftService.submit(user, dto);
    }

    /**
     * GET /api/shifts/period
     * シフト一覧（期間指定）
     */
    @Get('period')
    @Roles('Cast', 'Staff', 'Manager', 'Admin', 'SystemAdmin')
    async list(
        @CurrentUser() user: RequestUser,
        @Query('accountId') accountId?: string,
        @Query('periodStart') periodStart?: string,
        @Query('periodEnd') periodEnd?: string,
        @Query('status') status?: string,
    ) {
        return this.shiftService.list(user, {
            accountId,
            periodStart,
            periodEnd,
            status,
        });
    }

    /**
     * POST /api/shifts/approve
     * シフト一括承認/差戻（Manager / Admin）
     */
    @Post('approve')
    @Roles('Manager', 'Admin', 'SystemAdmin')
    @HttpCode(HttpStatus.OK)
    async approve(
        @CurrentUser() user: RequestUser,
        @Body() dto: ApproveShiftsDto,
    ) {
        return this.shiftService.approve(user, dto);
    }

    /**
     * POST /api/shifts/change-request
     * シフト変更申請（Cast / Staff）
     */
    @Post('change-request')
    @Roles('Cast', 'Staff', 'Manager', 'Admin', 'SystemAdmin')
    @HttpCode(HttpStatus.CREATED)
    async changeRequest(
        @CurrentUser() user: RequestUser,
        @Body() dto: ShiftChangeRequestDto,
    ) {
        return this.shiftService.requestChange(user, dto);
    }
}
