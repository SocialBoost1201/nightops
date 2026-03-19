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
import { CustomerService } from './customer.service';
import { CreateCustomerDto, UpdateCustomerDto } from './customer.dto';

import {
    JwtAuthGuard,
    RolesGuard,
    TenantGuard,
    Roles,
    CurrentUser,
    RequestUser,
} from '../../common';

@Controller('customers')
@UseGuards(JwtAuthGuard, RolesGuard, TenantGuard)
export class CustomerController {
    constructor(private readonly customerService: CustomerService) {}

    @Post()
    @Roles('Manager', 'Admin', 'SystemAdmin')
    @HttpCode(HttpStatus.CREATED)
    async create(@CurrentUser() user: RequestUser, @Body() dto: CreateCustomerDto) {
        return this.customerService.create(user, dto);
    }

    @Get()
    @Roles('Manager', 'Admin', 'SystemAdmin')
    async list(@CurrentUser() user: RequestUser, @Query('search') search?: string) {
        return this.customerService.list(user, search);
    }

    @Put(':id')
    @Roles('Manager', 'Admin', 'SystemAdmin')
    async update(
        @CurrentUser() user: RequestUser,
        @Param('id') id: string,
        @Body() dto: UpdateCustomerDto,
    ) {
        return this.customerService.update(user, id, dto);
    }

    @Delete(':id')
    @Roles('Manager', 'Admin', 'SystemAdmin')
    async delete(@CurrentUser() user: RequestUser, @Param('id') id: string) {
        return this.customerService.softDelete(user, id);
    }

    @Get(':id/summary')
    @Roles('Manager', 'Admin', 'SystemAdmin')
    async getSummary(@CurrentUser() user: RequestUser, @Param('id') id: string) {
        return this.customerService.getCustomerSummary(user, id);
    }

    /**
     * POST /api/customers/:id/merge
     * 顧客名寄せ（id = 統合元 targetId、body.sourceId を統合先として論理削除）
     */
    @Post(':id/merge')
    @Roles('Admin', 'SystemAdmin')
    @HttpCode(HttpStatus.OK)
    async merge(
        @CurrentUser() user: RequestUser,
        @Param('id') targetId: string,
        @Body('sourceId') sourceId: string,
    ) {
        return this.customerService.mergeCustomers(user, sourceId, targetId);
    }
}

