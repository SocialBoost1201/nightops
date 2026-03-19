import {
    Controller,
    Get,
    Put,
    Body,
    UseGuards,
} from '@nestjs/common';
import { MasterService } from './master.service';
import { UpdateStoreSettingsDto } from './master.dto';
import {
    JwtAuthGuard,
    RolesGuard,
    TenantGuard,
    Roles,
    CurrentUser,
    RequestUser,
} from '../../common';

@Controller('master/settings')
@UseGuards(JwtAuthGuard, RolesGuard, TenantGuard)
export class MasterController {
    constructor(private readonly masterService: MasterService) {}

    @Get()
    @Roles('Manager', 'Admin', 'SystemAdmin')
    async getSettings(@CurrentUser() user: RequestUser) {
        return this.masterService.getSettings(user);
    }

    @Put()
    @Roles('Admin', 'SystemAdmin')
    async updateSettings(
        @CurrentUser() user: RequestUser,
        @Body() dto: UpdateStoreSettingsDto,
    ) {
        return this.masterService.updateSettings(user, dto);
    }
}
