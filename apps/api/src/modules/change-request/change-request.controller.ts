import {
    Controller,
    Get,
    Post,
    Param,
    Body,
    UseGuards,
    HttpCode,
    HttpStatus,
} from '@nestjs/common';
import { ChangeRequestService } from './change-request.service';
import { ProcessChangeRequestDto } from './change-request.dto';
import {
    JwtAuthGuard,
    RolesGuard,
    TenantGuard,
    Roles,
    CurrentUser,
    RequestUser,
} from '../../common';

@Controller('change-requests')
@UseGuards(JwtAuthGuard, RolesGuard, TenantGuard)
export class ChangeRequestController {
    constructor(private readonly changeRequestService: ChangeRequestService) {}

    @Get('pending')
    @Roles('Manager', 'Admin', 'SystemAdmin')
    async listPending(@CurrentUser() user: RequestUser) {
        return this.changeRequestService.listPending(user);
    }

    @Get('my')
    @Roles('Cast', 'Staff', 'Manager', 'Admin', 'SystemAdmin')
    async listMyRequests(@CurrentUser() user: RequestUser) {
        return this.changeRequestService.listMyRequests(user);
    }

    @Post(':id/process')
    @Roles('Manager', 'Admin', 'SystemAdmin')
    @HttpCode(HttpStatus.OK)
    async process(
        @CurrentUser() user: RequestUser,
        @Param('id') id: string,
        @Body() dto: ProcessChangeRequestDto,
    ) {
        return this.changeRequestService.process(user, id, dto);
    }
}
