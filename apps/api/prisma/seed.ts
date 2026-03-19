import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
    console.log('🌱 シードデータ投入開始...');

    // 1. テナント作成
    const tenant = await prisma.tenant.upsert({
        where: { id: '00000000-0000-0000-0000-000000000001' },
        update: {},
        create: {
            id: '00000000-0000-0000-0000-000000000001',
            name: 'アニモ',
        },
    });
    console.log(`✅ テナント作成: ${tenant.name}`);

    // 2. 店舗設定
    await prisma.storeSettings.upsert({
        where: { tenantId: tenant.id },
        update: {},
        create: {
            tenantId: tenant.id,
            storeCode: 'anim',
            serviceTaxMultiplier: 1.32,
            taxRate: 0.10,
            serviceRate: 0.20,
            roundingUnit: 1000,
            roundingThreshold: 500,
            inhouseDefault: 1000,
            drinkDefault: 100,
            shiftCycleDays: 14,
            dailyCloseTime: '05:00',
            timezone: 'Asia/Tokyo',
        },
    });
    console.log('✅ 店舗設定作成');

    // 3. 管理者アカウント
    const adminHash = await bcrypt.hash('Admin1234!', 12);
    const adminAccount = await prisma.account.upsert({
        where: { loginId: 'anim-0001' },
        update: {},
        create: {
            tenantId: tenant.id,
            loginId: 'anim-0001',
            passwordHash: adminHash,
            role: 'Admin',
            status: 'active',
        },
    });

    await prisma.userProfile.upsert({
        where: { accountId: adminAccount.id },
        update: {},
        create: {
            accountId: adminAccount.id,
            tenantId: tenant.id,
            displayName: '管理者',
            userType: 'staff',
            employmentStatus: 'active',
        },
    });
    console.log('✅ 管理者: anim-0001 / Admin1234!');

    // 4. マネージャーアカウント
    const managerHash = await bcrypt.hash('Manager1234!', 12);
    const managerAccount = await prisma.account.upsert({
        where: { loginId: 'anim-0002' },
        update: {},
        create: {
            tenantId: tenant.id,
            loginId: 'anim-0002',
            passwordHash: managerHash,
            role: 'Manager',
            status: 'active',
        },
    });

    await prisma.userProfile.upsert({
        where: { accountId: managerAccount.id },
        update: {},
        create: {
            accountId: managerAccount.id,
            tenantId: tenant.id,
            displayName: '店長',
            userType: 'staff',
            employmentStatus: 'active',
        },
    });
    console.log('✅ 店長: anim-0002 / Manager1234!');

    // 5. 料金マスタ
    const priceItems = [
        { itemCode: 'SET_HOUSE', itemName: 'セット（ハウス）', unitPrice: 7000, unit: '1名60分', chargeType: 'PER_PERSON', durationMinutes: 60, applyPerPerson: true, sortOrder: 1 },
        { itemCode: 'SET_FREE_A', itemName: 'セット（フリー）A', unitPrice: 4000, unit: '1名60分', chargeType: 'PER_PERSON', durationMinutes: 60, applyPerPerson: true, sortOrder: 2 },
        { itemCode: 'SET_FREE_B', itemName: 'セット（フリー）B', unitPrice: 5000, unit: '1名60分', chargeType: 'PER_PERSON', durationMinutes: 60, applyPerPerson: true, sortOrder: 3 },
        { itemCode: 'TC', itemName: 'T・C', unitPrice: 6000, unit: '1名60分', chargeType: 'PER_PERSON', durationMinutes: 60, applyPerPerson: true, sortOrder: 4 },
        { itemCode: 'HONSHIMEI', itemName: '本指名', unitPrice: 3000, unit: '1本', chargeType: 'PER_COUNT', sortOrder: 5 },
        { itemCode: 'DOUHAN', itemName: '同伴', unitPrice: 5000, unit: '1本', chargeType: 'PER_COUNT', sortOrder: 6 },
        { itemCode: 'BANAI', itemName: '場内指名', unitPrice: 2000, unit: '1本', chargeType: 'PER_COUNT', sortOrder: 7 },
        { itemCode: 'P1', itemName: 'P1', unitPrice: 3000, unit: '1回', chargeType: 'PER_COUNT', sortOrder: 8 },
        { itemCode: 'P2', itemName: 'P2', unitPrice: 3500, unit: '1回', chargeType: 'PER_COUNT', sortOrder: 9 },
        { itemCode: 'SP', itemName: 'SP', unitPrice: 2000, unit: '1回', chargeType: 'PER_COUNT', sortOrder: 10 },
        { itemCode: 'SP2', itemName: 'SP2', unitPrice: 2500, unit: '1回', chargeType: 'PER_COUNT', sortOrder: 11 },
        { itemCode: 'SP3', itemName: 'SP3', unitPrice: 3000, unit: '1回', chargeType: 'PER_COUNT', sortOrder: 12 },
        { itemCode: 'SP4', itemName: 'SP4', unitPrice: 3500, unit: '1回', chargeType: 'PER_COUNT', sortOrder: 13 },
        { itemCode: 'TS_60', itemName: 'T・S 60（延長）', unitPrice: 7000, unit: '1名60分', chargeType: 'PER_TIME', durationMinutes: 60, applyPerPerson: true, sortOrder: 14 },
        { itemCode: 'TS_30', itemName: 'T・S 30（延長）', unitPrice: 3500, unit: '1名30分', chargeType: 'PER_TIME', durationMinutes: 30, applyPerPerson: true, sortOrder: 15 },
    ];

    for (const item of priceItems) {
        await prisma.priceItem.upsert({
            where: {
                uq_price_items_tenant_code: {
                    tenantId: tenant.id,
                    itemCode: item.itemCode,
                },
            },
            update: {},
            create: {
                tenantId: tenant.id,
                ...item,
            },
        });
    }
    console.log(`✅ 料金マスタ: ${priceItems.length}件`);

    console.log('\n🎉 シードデータ投入完了！');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('管理者: anim-0001 / Admin1234!');
    console.log('店長:   anim-0002 / Manager1234!');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
}

main()
    .catch((e) => {
        console.error('❌ シードエラー:', e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
