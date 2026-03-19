import {
    Controller,
    Get,
    Post,
    Put,
    Param,
    Body,
    UseGuards,
    HttpCode,
    HttpStatus,
} from '@nestjs/common';
import { UserService } from './user.service';
import { CreateUserDto, UpdateUserStatusDto } from './user.dto';
import {
    JwtAuthGuard,
    RolesGuard,
    TenantGuard,
    Roles,
    CurrentUser,
    RequestUser,
} from '../../common';

@Controller('users')
@UseGuards(JwtAuthGuard, RolesGuard, TenantGuard)
export class UserController {
    constructor(private readonly userService: UserService) {}

    @Post()
    @Roles('Admin', 'SystemAdmin')
    @HttpCode(HttpStatus.CREATED)
    async createUser(
        @CurrentUser() user: RequestUser,
        @Body() dto: CreateUserDto,
    ) {
        return this.userService.createUser(user.tenantId, dto);
    }

    @Get()
    @Roles('Admin', 'SystemAdmin')
    async listUsers(@CurrentUser() user: RequestUser) {
        return this.userService.listUsers(user.tenantId);
    }

    @Put(':id/status')
    @Roles('Admin', 'SystemAdmin')
    async updateStatus(
        @CurrentUser() user: RequestUser,
        @Param('id') accountId: string,
        @Body() dto: UpdateUserStatusDto,
    ) {
        return this.userService.updateStatus(user.tenantId, accountId, dto);
    }

    @Post(':id/reset-password')
    @Roles('Admin', 'SystemAdmin')
    @HttpCode(HttpStatus.OK)
    async resetPassword(
        @CurrentUser() user: RequestUser,
        @Param('id') accountId: string,
    ) {
        return this.userService.resetPassword(user.tenantId, accountId);
    }
}
