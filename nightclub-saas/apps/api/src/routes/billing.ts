import express, { Request, Response, NextFunction } from 'express';
import Stripe from 'stripe';
import { PrismaClient } from '../../prisma/generated/client';
import { authenticate, APIError } from '../middleware';
import { AppErrorCodes } from '../common/error-codes';
import { writeAuditLogFromRequest } from '../common/audit/audit.service';

const router = express.Router();
const prisma = new PrismaClient();
// TypeScriptの型エラーを避けるため、Stripeのバージョン指定を適当に設定（あるいは any キャスト）
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || 'sk_test_123', {
  apiVersion: '2024-06-20' as any,
});

const STRIPE_WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET || 'whsec_test_mock';

// =======================
// POST /billing/create-checkout-session
// 課金（サブスクリプション）開始用のCheckoutURLを発行する
// =======================
router.post('/create-checkout-session', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { planId } = req.body;
    const user = (req as any).user;

    const tenant = await prisma.tenant.findUnique({
      where: { id: user.tenantId },
    });

    if (!tenant) {
      throw new APIError(404, AppErrorCodes.NOT_FOUND, 'Tenant not found');
    }

    const plan = await prisma.plan.findUnique({
      where: { id: planId },
    });

    if (!plan) {
      throw new APIError(404, AppErrorCodes.NOT_FOUND, 'Plan not found');
    }

    // すでにStripe Customerがあるか確認し、なければ作成
    let stripeCustomerId = tenant.stripeCustomerId;
    if (!stripeCustomerId) {
      const customer = await stripe.customers.create({
        name: tenant.name,
        metadata: { tenantId: tenant.id },
      });
      stripeCustomerId = customer.id;
      // Tenantに記録
      await prisma.tenant.update({
        where: { id: tenant.id },
        data: { stripeCustomerId },
      });
    }

    // Checkout セッション作成
    const session = await stripe.checkout.sessions.create({
      customer: stripeCustomerId,
      mode: 'subscription',
      line_items: [
        {
          price_data: {
            currency: 'jpy',
            product_data: {
              name: plan.name,
            },
            unit_amount: plan.price,
            recurring: { interval: 'month' },
          },
          quantity: 1,
        },
      ],
      success_url: `${process.env.FRONTEND_URL || 'http://localhost:3000'}/admin/billing/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.FRONTEND_URL || 'http://localhost:3000'}/admin/billing/cancel`,
      metadata: {
        tenantId: tenant.id,
        planId: plan.id,
      },
    });

    res.json({ url: session.url });
  } catch (error) {
    next(error);
  }
});

// =======================
// POST /billing/webhook
// Stripeからの非同期イベント処理（冪等性を担保）
// =======================
router.post('/webhook', async (req: Request, res: Response, next: NextFunction) => {
  const sig = req.headers['stripe-signature'] as string;
  let event: Stripe.Event;

  try {
    const rawBody = (req as any).rawBody;
    if (!rawBody) {
      throw new Error('No raw body found for webhook signature validation');
    }
    event = stripe.webhooks.constructEvent(rawBody, sig, STRIPE_WEBHOOK_SECRET);
  } catch (err: any) {
    console.error(`Webhook signature verification failed: ${err.message}`);
    // ローカル環境等のテスト用：署名検証をスキップして進める簡易フォールバック（本番では消す）
    if (process.env.NODE_ENV !== 'production' && req.body && req.body.type) {
      event = req.body as Stripe.Event;
    } else {
      res.status(400).send(`Webhook Error: ${err.message}`);
      return;
    }
  }

  const eventId = event.id; // evt_xxx

  // 1. Webhookの冪等性チェック（重複排除）
  try {
    const existingEvent = await prisma.stripeEvent.findUnique({
      where: { id: eventId },
    });
    if (existingEvent) {
      console.log(`Webhook event ${eventId} already processed. Skipping.`);
      res.json({ received: true });
      return;
    }

    // イベント記録を作成してロック的に確保（並列時の厳密な制御が必要な場合はDB制約に頼る）
    await prisma.stripeEvent.create({
      data: {
        id: eventId,
        type: event.type,
        status: 'processing',
      },
    });
  } catch (error: any) {
    if (error.code === 'P2002') { // Prisma Unique constraint failed
      console.log(`Webhook event ${eventId} already being processed in parallel. Skipping.`);
      res.json({ received: true });
      return;
    }
    console.error('Failed to check/create idempotency key:', error);
    res.status(500).send('Internal Server Error');
    return;
  }

  try {
    // 処理開始
    switch (event.type) {
      case 'invoice.payment_succeeded':
        await handlePaymentSucceeded(event.data.object as Stripe.Invoice, req);
        break;
      case 'invoice.payment_failed':
        await handlePaymentFailed(event.data.object as Stripe.Invoice, req);
        break;
      case 'customer.subscription.updated':
        await handleSubscriptionUpdated(event.data.object as Stripe.Subscription, req);
        break;
      case 'customer.subscription.deleted':
        await handleSubscriptionDeleted(event.data.object as Stripe.Subscription, req);
        break;
      case 'checkout.session.completed':
        // サブスクリプション作成時の初回処理など
        await handleCheckoutCompleted(event.data.object as Stripe.Checkout.Session, req);
        break;
      default:
        console.log(`Unhandled event type ${event.type}`);
    }

    // 処理完了としてマーク
    await prisma.stripeEvent.update({
      where: { id: eventId },
      data: { status: 'processed' },
    });

    res.json({ received: true });
  } catch (error) {
    console.error(`Error processing webhook event ${event.id}:`, error);
    await prisma.stripeEvent.update({
      where: { id: eventId },
      data: { status: 'failed' },
    });
    res.status(500).send('Webhook processing failed');
  }
});

async function handleCheckoutCompleted(session: Stripe.Checkout.Session, req: Request) {
  if (session.mode !== 'subscription') return;
  const tenantId = session.metadata?.tenantId;
  const planId = session.metadata?.planId;
  const subscriptionId = (session as any).subscription as string;

  if (tenantId && planId) {
    await prisma.$transaction(async (tx) => {
      const beforeSub = await tx.subscription.findUnique({
        where: { tenantId },
      });
      const beforeTenant = await tx.tenant.findUnique({
        where: { id: tenantId },
      });

      const sub = await tx.subscription.upsert({
        where: { tenantId },
        update: {
          stripeSubscriptionId: subscriptionId,
          status: 'active',
        },
        create: {
          tenantId,
          stripeSubscriptionId: subscriptionId,
          status: 'active',
        },
      });

      const tenant = await tx.tenant.update({
        where: { id: tenantId },
        data: {
          status: 'active',
          planId,
        },
      });

      await writeAuditLogFromRequest(tx, req, {
        action: 'SYNC_SUBSCRIPTION_FROM_CHECKOUT',
        resourceType: 'Subscription',
        resourceId: sub.id,
        tenantId,
        before: beforeSub ? { status: beforeSub.status, stripeSubscriptionId: beforeSub.stripeSubscriptionId } : null,
        after: { status: sub.status, stripeSubscriptionId: sub.stripeSubscriptionId },
        source: 'stripe_webhook',
      }, 'strict');

      await writeAuditLogFromRequest(tx, req, {
        action: 'UPDATE_TENANT_STATUS_FROM_BILLING',
        resourceType: 'Tenant',
        resourceId: tenant.id,
        tenantId,
        before: beforeTenant ? { status: beforeTenant.status, planId: beforeTenant.planId } : null,
        after: { status: tenant.status, planId: tenant.planId },
        source: 'stripe_webhook',
      }, 'strict');
    });
  }
}

async function handlePaymentSucceeded(invoice: Stripe.Invoice, req: Request) {
  const stripeSubscriptionId = (invoice as any).subscription as string;
  if (!stripeSubscriptionId) return;

  const sub = await prisma.subscription.findUnique({
    where: { stripeSubscriptionId },
  });

  if (sub) {
    await prisma.$transaction(async (tx) => {
      const beforeSub = await tx.subscription.findUnique({ where: { id: sub.id } });
      const beforeTenant = await tx.tenant.findUnique({ where: { id: sub.tenantId } });

      await tx.billingHistory.create({
        data: {
          tenantId: sub.tenantId,
          amount: invoice.amount_paid,
          status: 'succeeded',
          paidAt: new Date(),
        },
      });

      const updatedSub = await tx.subscription.update({
        where: { id: sub.id },
        data: { status: 'active' },
      });

      const updatedTenant = await tx.tenant.update({
        where: { id: sub.tenantId },
        data: { status: 'active' },
      });

      await writeAuditLogFromRequest(tx, req, {
        action: 'UPDATE_SUBSCRIPTION_STATUS',
        resourceType: 'Subscription',
        resourceId: updatedSub.id,
        tenantId: sub.tenantId,
        before: beforeSub ? { status: beforeSub.status } : null,
        after: { status: updatedSub.status },
        source: 'stripe_webhook',
      }, 'strict');

      await writeAuditLogFromRequest(tx, req, {
        action: 'UPDATE_TENANT_STATUS_FROM_BILLING',
        resourceType: 'Tenant',
        resourceId: updatedTenant.id,
        tenantId: sub.tenantId,
        before: beforeTenant ? { status: beforeTenant.status } : null,
        after: { status: updatedTenant.status },
        source: 'stripe_webhook',
      }, 'strict');
    });
  }
}

async function handlePaymentFailed(invoice: Stripe.Invoice, req: Request) {
  const stripeSubscriptionId = (invoice as any).subscription as string;
  if (!stripeSubscriptionId) return;

  const sub = await prisma.subscription.findUnique({
    where: { stripeSubscriptionId },
  });

  if (sub) {
    await prisma.$transaction(async (tx) => {
      const beforeSub = await tx.subscription.findUnique({ where: { id: sub.id } });
      const beforeTenant = await tx.tenant.findUnique({ where: { id: sub.tenantId } });

      await tx.billingHistory.create({
        data: {
          tenantId: sub.tenantId,
          amount: invoice.amount_due,
          status: 'failed',
          paidAt: new Date(),
        },
      });

      const updatedSub = await tx.subscription.update({
        where: { id: sub.id },
        data: { status: 'past_due' },
      });

      const updatedTenant = await tx.tenant.update({
        where: { id: sub.tenantId },
        data: { status: 'past_due' },
      });

      await writeAuditLogFromRequest(tx, req, {
        action: 'UPDATE_SUBSCRIPTION_STATUS',
        resourceType: 'Subscription',
        resourceId: updatedSub.id,
        tenantId: sub.tenantId,
        before: beforeSub ? { status: beforeSub.status } : null,
        after: { status: updatedSub.status },
        source: 'stripe_webhook',
      }, 'strict');

      await writeAuditLogFromRequest(tx, req, {
        action: 'UPDATE_TENANT_STATUS_FROM_BILLING',
        resourceType: 'Tenant',
        resourceId: updatedTenant.id,
        tenantId: sub.tenantId,
        before: beforeTenant ? { status: beforeTenant.status } : null,
        after: { status: updatedTenant.status },
        source: 'stripe_webhook',
      }, 'strict');
    });
  }
}

async function handleSubscriptionUpdated(stripeSub: Stripe.Subscription, req: Request) {
  const stripeSubscriptionId = stripeSub.id;
  const sub = await prisma.subscription.findUnique({
    where: { stripeSubscriptionId },
  });

  if (sub) {
    // 順不同耐性: すでにローカルで解約(canceled)になっている場合、後から遅れて届いたupdatedイベントで以前の状態に戻さない
    if (sub.status === 'canceled' && stripeSub.status !== 'canceled') {
      console.log(`Skipping update for subscription ${sub.id} because it is already canceled locally.`);
      return;
    }

    await prisma.$transaction(async (tx) => {
      const beforeSub = await tx.subscription.findUnique({ where: { id: sub.id } });
      const beforeTenant = await tx.tenant.findUnique({ where: { id: sub.tenantId } });

      const updatedSub = await tx.subscription.update({
        where: { id: sub.id },
        data: {
          status: stripeSub.status,
          currentPeriodStart: new Date((stripeSub as any).current_period_start * 1000),
          currentPeriodEnd: new Date((stripeSub as any).current_period_end * 1000),
        },
      });

      // テナント状態の同期 (Stripe -> SaaS Application Status)
      let newTenantStatus = 'active'; // fallback
      switch (stripeSub.status) {
        case 'active':
        case 'trialing':
          newTenantStatus = 'active';
          break;
        case 'past_due':
        case 'unpaid':
          newTenantStatus = 'past_due';
          break;
        case 'canceled':
        case 'incomplete_expired':
          newTenantStatus = 'canceled';
          break;
        case 'paused':
          newTenantStatus = 'suspended';
          break;
        default:
          newTenantStatus = 'active'; // 'incomplete' などは一旦active扱い（Checkout完了前はtrialのまま等）
      }

      const updatedTenant = await tx.tenant.update({
        where: { id: sub.tenantId },
        data: { status: newTenantStatus },
      });

      await writeAuditLogFromRequest(tx, req, {
        action: 'UPDATE_SUBSCRIPTION_STATUS',
        resourceType: 'Subscription',
        resourceId: updatedSub.id,
        tenantId: sub.tenantId,
        before: beforeSub ? { status: beforeSub.status } : null,
        after: { status: updatedSub.status },
        source: 'stripe_webhook',
      }, 'strict');

      await writeAuditLogFromRequest(tx, req, {
        action: 'UPDATE_TENANT_STATUS_FROM_BILLING',
        resourceType: 'Tenant',
        resourceId: updatedTenant.id,
        tenantId: sub.tenantId,
        before: beforeTenant ? { status: beforeTenant.status } : null,
        after: { status: updatedTenant.status },
        source: 'stripe_webhook',
      }, 'strict');
    });
  }
}

async function handleSubscriptionDeleted(stripeSub: Stripe.Subscription, req: Request) {
  const stripeSubscriptionId = stripeSub.id;
  const sub = await prisma.subscription.findUnique({
    where: { stripeSubscriptionId },
  });

  if (sub) {
    await prisma.$transaction(async (tx) => {
      const beforeSub = await tx.subscription.findUnique({ where: { id: sub.id } });
      const beforeTenant = await tx.tenant.findUnique({ where: { id: sub.tenantId } });

      const updatedSub = await tx.subscription.update({
        where: { id: sub.id },
        data: { status: 'canceled' },
      });

      const updatedTenant = await tx.tenant.update({
        where: { id: sub.tenantId },
        data: { status: 'canceled' },
      });

      await writeAuditLogFromRequest(tx, req, {
        action: 'UPDATE_SUBSCRIPTION_STATUS',
        resourceType: 'Subscription',
        resourceId: updatedSub.id,
        tenantId: sub.tenantId,
        before: beforeSub ? { status: beforeSub.status } : null,
        after: { status: updatedSub.status },
        source: 'stripe_webhook',
      }, 'strict');

      await writeAuditLogFromRequest(tx, req, {
        action: 'UPDATE_TENANT_STATUS_FROM_BILLING',
        resourceType: 'Tenant',
        resourceId: updatedTenant.id,
        tenantId: sub.tenantId,
        before: beforeTenant ? { status: beforeTenant.status } : null,
        after: { status: updatedTenant.status },
        source: 'stripe_webhook',
      }, 'strict');
    });
  }
}

// =======================
// GET /billing/overview
// テナント自身の現在のプラン、契約状態、次回請求日などを取得
// =======================
router.get('/overview', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user = (req as any).user;
    const tenantId = user.tenantId;

    const tenant = await prisma.tenant.findUnique({
      where: { id: tenantId },
      include: {
        plan: true,
        subscription: true,
      },
    });

    if (!tenant) throw new APIError(404, AppErrorCodes.NOT_FOUND, 'Tenant not found');

    const latestHistory = await prisma.billingHistory.findFirst({
      where: { tenantId },
      orderBy: { paidAt: 'desc' },
    });

    res.json({
      plan: tenant.plan,
      status: tenant.status,      // trial, active, past_due, suspended, canceled
      subscription: tenant.subscription, // currentPeriodEnd 等
      latestHistory,              // 直近の支払結果
    });
  } catch (error) {
    next(error);
  }
});

// =======================
// GET /billing/history
// テナント自身の課金・請求履歴を取得
// =======================
router.get('/history', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user = (req as any).user;
    const records = await prisma.billingHistory.findMany({
      where: { tenantId: user.tenantId },
      orderBy: { paidAt: 'desc' },
    });
    res.json(records);
  } catch (error) {
    next(error);
  }
});

export default router;
