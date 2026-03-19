import express, { Request, Response, NextFunction } from 'express';
import { PrismaClient } from '../../prisma/generated/client';
import { authenticate, APIError, requireRoles } from '../middleware';

const router = express.Router();
const prisma = new PrismaClient();
const systemAdminOnly = requireRoles(['SystemAdmin']);

// =======================
// GET /system/tenants
// 全テナントの一覧を取得（プラン・サブスクリプション情報含む）
// =======================
router.get('/tenants', authenticate, systemAdminOnly, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tenants = await prisma.tenant.findMany({
      include: {
        plan: true,
        subscription: true,
      },
      orderBy: { createdAt: 'desc' },
    });
    res.json(tenants);
  } catch (error) {
    next(error);
  }
});

// =======================
// POST /system/tenants
// 新規テナントを作成する（トライアルで開始するのが基本）
// =======================
router.post('/tenants', authenticate, systemAdminOnly, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { name, planId } = req.body;
    if (!name) {
      throw new APIError(400, 'VALID_001', 'name is required');
    }

    const tenant = await prisma.tenant.create({
      data: {
        name,
        planId,
        status: 'trial', // 初期状態はトライアル
      },
    });
    res.status(201).json(tenant);
  } catch (error) {
    next(error);
  }
});

// =======================
// PATCH /system/tenants/:id
// テナントの状態（status）やプラン（planId）を強制変更する
// =======================
router.patch('/tenants/:id', authenticate, systemAdminOnly, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const { status, planId } = req.body;
    
    // 存在チェック
    const existing = await prisma.tenant.findUnique({ where: { id } });
    if (!existing) {
      throw new APIError(404, 'TENANT_002', 'Tenant not found');
    }

    const tenant = await prisma.tenant.update({
      where: { id },
      data: {
        ...(status && { status }),
        ...(planId && { planId }),
      },
    });
    res.json(tenant);
  } catch (error) {
    next(error);
  }
});

// =======================
// GET /system/plans
// 利用可能なプラン一覧を取得
// =======================
router.get('/plans', authenticate, systemAdminOnly, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const plans = await prisma.plan.findMany({
      orderBy: { price: 'asc' },
    });
    res.json(plans);
  } catch (error) {
    next(error);
  }
});

// =======================
// GET /system/tenants/:id
// 特定テナントの詳細情報を取得（プラン、サブスクリプション、課金履歴など）
// =======================
router.get('/tenants/:id', authenticate, systemAdminOnly, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;

    const tenant = await prisma.tenant.findUnique({
      where: { id },
      include: {
        plan: true,
        subscription: true,
        billingHistory: {
          orderBy: { paidAt: 'desc' },
          take: 10,
        },
      },
    });

    if (!tenant) {
      throw new APIError(404, 'TENANT_002', 'Tenant not found');
    }

    // Webhook履歴 (全体から直近5件。本来はtenantIdで絞るのが望ましいがMVPとして直近履歴を表示)
    const recentWebhooks = await prisma.stripeEvent.findMany({
      orderBy: { createdAt: 'desc' },
      take: 5,
    });

    res.json({
      ...tenant,
      recentWebhooks,
    });
  } catch (error) {
    next(error);
  }
});

export default router;
