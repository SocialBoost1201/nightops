import {
    Injectable,
    Logger,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditLogService } from '../audit-log/audit-log.service';
import { RequestUser } from '../../common';
import { UpdateStoreSettingsDto } from './master.dto';
import { Prisma } from '@prisma/client';

@Injectable()
export class MasterService {
    private readonly logger = new Logger(MasterService.name);

    constructor(
        private readonly prisma: PrismaService,
        private readonly auditLogService: AuditLogService,
    ) {}

    /**
     * 店舗設定の取得
     */
    async getSettings(user: RequestUser) {
        let settings = await this.prisma.storeSettings.findUnique({
            where: { tenantId: user.tenantId },
        });

        // 未設定時はデフォルト値で作成して返す
        if (!settings) {
            settings = await this.prisma.storeSettings.create({
                data: {
                    tenantId: user.tenantId,
                    storeCode: 'DEFAULT',
                    serviceTaxMultiplier: 1.32,
                    roundingUnit: 1000,
                    roundingThreshold: 500,
                },
            });
        }

        return settings;
    }

    /**
     * 店舗設定の更新
     */
    async updateSettings(user: RequestUser, dto: UpdateStoreSettingsDto) {
        const current = await this.getSettings(user);

        const updated = await this.prisma.storeSettings.update({
            where: { tenantId: user.tenantId },
            data: {
                ...(dto.storeCode !== undefined ? { storeCode: dto.storeCode } : {}),
                ...(dto.serviceTaxMultiplier !== undefined
                    ? { serviceTaxMultiplier: dto.serviceTaxMultiplier }
                    : {}),
                ...(dto.roundingUnit !== undefined ? { roundingUnit: dto.roundingUnit } : {}),
                ...(dto.roundingThreshold !== undefined ? { roundingThreshold: dto.roundingThreshold } : {}),
            },
        });

        await this.auditLogService.log({
            user,
            actionType: 'UPDATE_STORE_SETTINGS',
            targetType: 'StoreSettings',
            targetId: updated.tenantId,
            beforeData: {
                storeCode: current.storeCode,
                serviceTaxMultiplier: current.serviceTaxMultiplier,
                roundingUnit: current.roundingUnit,
                roundingThreshold: current.roundingThreshold,
            },
            afterData: {
                storeCode: updated.storeCode,
                serviceTaxMultiplier: updated.serviceTaxMultiplier,
                roundingUnit: updated.roundingUnit,
                roundingThreshold: updated.roundingThreshold,
            },
        });

        return updated;
    }

    /**
     * 料金マスタ一覧取得
     */
    async getPriceItems(user: RequestUser) {
        return this.prisma.priceItem.findMany({
            where: { tenantId: user.tenantId, isActive: true },
            orderBy: { sortOrder: 'asc' },
        });
    }
}
