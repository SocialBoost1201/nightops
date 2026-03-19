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
import { CompensationPlanService } from './compensation-plan.service';
import { CreateCompensationPlanDto } from './compensation-plan.dto';
import {
    JwtAuthGuard,
    RolesGuard,
    TenantGuard,
    Roles,
    CurrentUser,
    RequestUser,
} from '../../common';

@Controller('admin/compensation-plans')
@UseGuards(JwtAuthGuard, RolesGuard, TenantGuard)
export class CompensationPlanController {
    constructor(private readonly compensationPlanService: CompensationPlanService) {}

    @Post()
    @Roles('Admin', 'SystemAdmin')
    @HttpCode(HttpStatus.CREATED)
    async create(
        @CurrentUser() user: RequestUser,
        @Body() dto: CreateCompensationPlanDto,
    ) {
        return this.compensationPlanService.create(user.tenantId, dto);
    }

    @Get()
    @Roles('Admin', 'SystemAdmin')
    async list(
        @CurrentUser() user: RequestUser,
        @Query('accountId') accountId?: string,
    ) {
        return this.compensationPlanService.list(user.tenantId, accountId);
    }
}
