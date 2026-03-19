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

@Controller('master')
@UseGuards(JwtAuthGuard, RolesGuard, TenantGuard)
export class MasterController {
    constructor(private readonly masterService: MasterService) {}

    @Get('settings')
    @Roles('Manager', 'Admin', 'SystemAdmin')
    async getSettings(@CurrentUser() user: RequestUser) {
        return this.masterService.getSettings(user);
    }

    @Put('settings')
    @Roles('Admin', 'SystemAdmin')
    async updateSettings(
        @CurrentUser() user: RequestUser,
        @Body() dto: UpdateStoreSettingsDto,
    ) {
        return this.masterService.updateSettings(user, dto);
    }

    @Get('price-items')
    @Roles('Manager', 'Admin', 'SystemAdmin')
    async getPriceItems(@CurrentUser() user: RequestUser) {
        return this.masterService.getPriceItems(user);
    }
}

