import { Module } from '@nestjs/common';
import { APP_FILTER } from '@nestjs/core';
import { ThrottlerModule } from '@nestjs/throttler';
import { PrismaModule } from './prisma/prisma.module';
import { ApiErrorFilter } from './common/filters/api-error.filter';

// M1: 認証・基盤
import { AuthModule } from './modules/auth/auth.module';
import { UserModule } from './modules/user/user.module';
import { AuditLogModule } from './modules/audit-log/audit-log.module';
import { CompensationPlanModule } from './modules/compensation-plan/compensation-plan.module';

// M2: シフト
import { ShiftModule } from './modules/shift/shift.module';

// M3: 勤怠
import { AttendanceModule } from './modules/attendance/attendance.module';

// M4: 売上
import { SalesModule } from './modules/sales/sales.module';

// M5: 顧客
import { CustomerModule } from './modules/customer/customer.module';

// M6: 集計
import { ReportModule } from './modules/report/report.module';

// M7: 給与
import { PayrollModule } from './modules/payroll/payroll.module';

// M8: 仕上げ・マスタ
import { ChangeRequestModule } from './modules/change-request/change-request.module';
import { MasterModule } from './modules/master/master.module';

@Module({
    imports: [
        // Rate Limiting
        ThrottlerModule.forRoot([
            {
                ttl: 60000, // 60秒
                limit: 100, // 100リクエスト
            },
        ]),

        // Database
        PrismaModule,

        // M1: 認証・基盤
        AuthModule,
        UserModule,
        AuditLogModule,
        CompensationPlanModule,

        // M2: シフト
        ShiftModule,

        // M3: 勤怠
        AttendanceModule,

        // M4: 売上
        SalesModule,

        // M5: 顧客
        CustomerModule,

        // M6: 集計
        ReportModule,

        // M7: 給与
        PayrollModule,

        // M8: 仕上げ・マスタ
        ChangeRequestModule,
        MasterModule,
    ],
    controllers: [],
    providers: [
        // グローバル例外フィルター
        {
            provide: APP_FILTER,
            useClass: ApiErrorFilter,
        },
    ],
})
export class AppModule {}
