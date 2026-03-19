import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { AuditLogService } from './audit-log.service';
import {
    JwtAuthGuard,
    RolesGuard,
    TenantGuard,
    Roles,
    CurrentUser,
    RequestUser,
} from '../../common';

@Controller('audit-logs')
@UseGuards(JwtAuthGuard, RolesGuard, TenantGuard)
export class AuditLogController {
    constructor(private readonly auditLogService: AuditLogService) {}

    @Get()
    @Roles('Admin', 'SystemAdmin')
    async search(
        @CurrentUser() user: RequestUser,
        @Query('targetType') targetType?: string,
        @Query('targetId') targetId?: string,
        @Query('actorId') actorId?: string,
        @Query('actionType') actionType?: string,
        @Query('from') from?: string,
        @Query('to') to?: string,
        @Query('page') page?: string,
        @Query('pageSize') pageSize?: string,
    ) {
        return this.auditLogService.search(
            user.tenantId,
            {
                targetType,
                targetId,
                actorId,
                actionType,
                from: from ? new Date(from) : undefined,
                to: to ? new Date(to) : undefined,
            },
            page ? parseInt(page, 10) : 1,
            pageSize ? parseInt(pageSize, 10) : 50,
        );
    }
}
