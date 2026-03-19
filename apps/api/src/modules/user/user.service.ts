import {
    Injectable,
    ConflictException,
    NotFoundException,
    Logger,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import { CreateUserDto, UpdateUserStatusDto } from './user.dto';

const BCRYPT_ROUNDS = parseInt(process.env.BCRYPT_ROUNDS || '12', 10);

@Injectable()
export class UserService {
    private readonly logger = new Logger(UserService.name);

    constructor(private readonly prisma: PrismaService) {}

    /**
     * loginId を自動発行
     * 形式: {storeCode}-{4桁連番}（欠番は埋めない）
     */
    private async generateLoginId(tenantId: string): Promise<string> {
        const settings = await this.prisma.storeSettings.findUnique({
            where: { tenantId },
        });

        if (!settings) {
            throw new NotFoundException({
                error: { code: 'TENANT_002', message: 'テナント情報が不正です' },
            });
        }

        // 現在の最大連番を取得
        const latestAccount = await this.prisma.account.findFirst({
            where: { tenantId },
            orderBy: { loginId: 'desc' },
            select: { loginId: true },
        });

        let nextSeq = 1;
        if (latestAccount) {
            const parts = latestAccount.loginId.split('-');
            const currentSeq = parseInt(parts[parts.length - 1], 10);
            if (!isNaN(currentSeq)) {
                nextSeq = currentSeq + 1;
            }
        }

        const seqStr = String(nextSeq).padStart(4, '0');
        return `${settings.storeCode}-${seqStr}`;
    }

    /**
     * 初期パスワードを生成（8文字のランダム文字列）
     */
    private generateInitialPassword(): string {
        return crypto.randomBytes(6).toString('base64url').slice(0, 8);
    }

    /**
     * ユーザー作成（Admin 操作）
     */
    async createUser(tenantId: string, dto: CreateUserDto) {
        const loginId = await this.generateLoginId(tenantId);
        const initialPassword = this.generateInitialPassword();
        const passwordHash = await bcrypt.hash(initialPassword, BCRYPT_ROUNDS);

        const account = await this.prisma.account.create({
            data: {
                tenantId,
                loginId,
                passwordHash,
                role: dto.role,
                userProfile: {
                    create: {
                        tenantId,
                        displayName: dto.displayName,
                        userType: dto.userType,
                    },
                },
                // 報酬プラン（任意）
                ...(dto.compensationPlan
                    ? {
                          compensationPlans: {
                              create: {
                                  tenantId,
                                  payType: dto.compensationPlan.payType,
                                  hourlyRate: dto.compensationPlan.hourlyRate ?? null,
                                  commissionRate: dto.compensationPlan.commissionRate ?? null,
                                  inhouseUnit: dto.compensationPlan.inhouseUnit ?? 1000,
                                  drinkUnit: dto.compensationPlan.drinkUnit ?? 100,
                                  effectiveFrom: new Date(dto.compensationPlan.effectiveFrom),
                                  effectiveTo: dto.compensationPlan.effectiveTo
                                      ? new Date(dto.compensationPlan.effectiveTo)
                                      : null,
                              },
                          },
                      }
                    : {}),
            },
            include: { userProfile: true },
        });

        return {
            accountId: account.id,
            loginId: account.loginId,
            initialPassword,
            displayName: account.userProfile?.displayName,
            role: account.role,
        };
    }

    /**
     * テナント内ユーザー一覧
     */
    async listUsers(tenantId: string) {
        const accounts = await this.prisma.account.findMany({
            where: { tenantId },
            include: {
                userProfile: true,
            },
            orderBy: { createdAt: 'asc' },
        });

        return accounts.map((a: typeof accounts[number]) => ({
            accountId: a.id,
            loginId: a.loginId,
            role: a.role,
            status: a.status,
            displayName: a.userProfile?.displayName || a.loginId,
            userType: a.userProfile?.userType,
            employmentStatus: a.userProfile?.employmentStatus,
            createdAt: a.createdAt,
        }));
    }

    /**
     * ユーザーステータス変更（active / inactive）
     */
    async updateStatus(tenantId: string, accountId: string, dto: UpdateUserStatusDto) {
        const account = await this.prisma.account.findFirst({
            where: { id: accountId, tenantId },
        });

        if (!account) {
            throw new NotFoundException({
                error: { code: 'VALID_001', message: '指定されたアカウントが見つかりません' },
            });
        }

        const updated = await this.prisma.account.update({
            where: { id: accountId },
            data: { status: dto.status },
            select: { id: true, loginId: true, role: true, status: true },
        });

        return updated;
    }

    /**
     * パスワード再発行（Admin 操作）
     */
    async resetPassword(tenantId: string, accountId: string) {
        const account = await this.prisma.account.findFirst({
            where: { id: accountId, tenantId },
        });

        if (!account) {
            throw new NotFoundException({
                error: { code: 'VALID_001', message: '指定されたアカウントが見つかりません' },
            });
        }

        const newPassword = this.generateInitialPassword();
        const passwordHash = await bcrypt.hash(newPassword, BCRYPT_ROUNDS);

        await this.prisma.account.update({
            where: { id: accountId },
            data: {
                passwordHash,
                passwordChangedAt: null, // 初回変更を再度強制
            },
        });

        return {
            loginId: account.loginId,
            newPassword,
        };
    }
}
