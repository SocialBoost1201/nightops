-- CreateTable
CREATE TABLE "tenants" (
    "tenant_id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "tenants_pkey" PRIMARY KEY ("tenant_id")
);

-- CreateTable
CREATE TABLE "store_settings" (
    "tenant_id" UUID NOT NULL,
    "store_code" TEXT NOT NULL,
    "service_tax_multiplier" DECIMAL NOT NULL DEFAULT 1.32,
    "tax_rate" DECIMAL NOT NULL DEFAULT 0.10,
    "service_rate" DECIMAL NOT NULL DEFAULT 0.20,
    "rounding_unit" INTEGER NOT NULL DEFAULT 1000,
    "rounding_threshold" INTEGER NOT NULL DEFAULT 500,
    "inhouse_default" INTEGER NOT NULL DEFAULT 1000,
    "drink_default" INTEGER NOT NULL DEFAULT 100,
    "shift_cycle_days" INTEGER NOT NULL DEFAULT 14,
    "daily_close_time" VARCHAR(5) NOT NULL DEFAULT '05:00',
    "timezone" TEXT NOT NULL DEFAULT 'Asia/Tokyo',

    CONSTRAINT "store_settings_pkey" PRIMARY KEY ("tenant_id")
);

-- CreateTable
CREATE TABLE "accounts" (
    "account_id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "login_id" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'active',
    "password_changed_at" TIMESTAMPTZ,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "accounts_pkey" PRIMARY KEY ("account_id")
);

-- CreateTable
CREATE TABLE "user_profiles" (
    "account_id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "display_name" TEXT NOT NULL,
    "user_type" TEXT NOT NULL,
    "employment_status" TEXT NOT NULL DEFAULT 'active',

    CONSTRAINT "user_profiles_pkey" PRIMARY KEY ("account_id")
);

-- CreateTable
CREATE TABLE "compensation_plans" (
    "plan_id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "account_id" UUID NOT NULL,
    "effective_from" DATE NOT NULL,
    "effective_to" DATE,
    "pay_type" TEXT NOT NULL,
    "hourly_rate" INTEGER,
    "commission_rate" DECIMAL,
    "inhouse_unit" INTEGER NOT NULL DEFAULT 1000,
    "drink_unit" INTEGER NOT NULL DEFAULT 100,

    CONSTRAINT "compensation_plans_pkey" PRIMARY KEY ("plan_id")
);

-- CreateTable
CREATE TABLE "shift_entries" (
    "shift_id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "account_id" UUID NOT NULL,
    "period_start" DATE NOT NULL,
    "period_end" DATE NOT NULL,
    "date" DATE NOT NULL,
    "planned_start" VARCHAR(5),
    "planned_end" VARCHAR(5),
    "memo" TEXT,
    "status" TEXT NOT NULL DEFAULT 'submitted',

    CONSTRAINT "shift_entries_pkey" PRIMARY KEY ("shift_id")
);

-- CreateTable
CREATE TABLE "punch_events" (
    "punch_id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "account_id" UUID NOT NULL,
    "business_date" DATE NOT NULL,
    "type" TEXT NOT NULL,
    "timestamp" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "punch_events_pkey" PRIMARY KEY ("punch_id")
);

-- CreateTable
CREATE TABLE "cast_checkouts" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "account_id" UUID NOT NULL,
    "business_date" DATE NOT NULL,
    "checkout_time" VARCHAR(5) NOT NULL,
    "set_by_account_id" UUID NOT NULL,

    CONSTRAINT "cast_checkouts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sales_slips" (
    "slip_id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "business_date" DATE NOT NULL,
    "table_no" TEXT,
    "customer_id" UUID,
    "customer_name_raw" TEXT,
    "party_size" INTEGER NOT NULL,
    "main_cast_id" UUID NOT NULL,
    "subtotal" INTEGER NOT NULL,
    "service_tax_amount" INTEGER NOT NULL,
    "total_rounded" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "closed_by" UUID,

    CONSTRAINT "sales_slips_pkey" PRIMARY KEY ("slip_id")
);

-- CreateTable
CREATE TABLE "sales_lines" (
    "line_id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "slip_id" UUID NOT NULL,
    "item_code" TEXT NOT NULL,
    "item_name" TEXT NOT NULL,
    "qty" DECIMAL NOT NULL,
    "unit_price" INTEGER NOT NULL,
    "amount" INTEGER NOT NULL,

    CONSTRAINT "sales_lines_pkey" PRIMARY KEY ("line_id")
);

-- CreateTable
CREATE TABLE "drink_counts" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "slip_id" UUID NOT NULL,
    "cast_id" UUID NOT NULL,
    "cups" INTEGER NOT NULL,

    CONSTRAINT "drink_counts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "customers" (
    "customer_id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "kana" TEXT,
    "memo" TEXT,
    "deleted_at" TIMESTAMPTZ,

    CONSTRAINT "customers_pkey" PRIMARY KEY ("customer_id")
);

-- CreateTable
CREATE TABLE "daily_closes" (
    "close_id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "business_date" DATE NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'open',
    "closed_by" UUID,
    "closed_at" TIMESTAMPTZ,

    CONSTRAINT "daily_closes_pkey" PRIMARY KEY ("close_id")
);

-- CreateTable
CREATE TABLE "monthly_closes" (
    "close_id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "month" VARCHAR(7) NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'open',
    "closed_by" UUID,
    "closed_at" TIMESTAMPTZ,

    CONSTRAINT "monthly_closes_pkey" PRIMARY KEY ("close_id")
);

-- CreateTable
CREATE TABLE "change_requests" (
    "request_id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "target_type" TEXT NOT NULL,
    "target_id" UUID NOT NULL,
    "reason" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "requested_by" UUID NOT NULL,
    "approved_by" UUID,
    "approved_at" TIMESTAMPTZ,
    "diff_json" JSONB NOT NULL,

    CONSTRAINT "change_requests_pkey" PRIMARY KEY ("request_id")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "log_id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "actor_account_id" UUID NOT NULL,
    "actor_role" TEXT NOT NULL,
    "action_type" TEXT NOT NULL,
    "target_type" TEXT NOT NULL,
    "target_id" UUID NOT NULL,
    "before_data" JSONB,
    "after_data" JSONB,
    "reason" TEXT,
    "request_id" UUID,
    "correlation_id" UUID,
    "ip_address" TEXT,
    "user_agent" TEXT,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("log_id")
);

-- CreateTable
CREATE TABLE "price_items" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "item_code" TEXT NOT NULL,
    "item_name" TEXT NOT NULL,
    "unit_price" INTEGER NOT NULL,
    "unit" TEXT NOT NULL,
    "charge_type" TEXT NOT NULL DEFAULT 'PER_COUNT',
    "duration_minutes" INTEGER,
    "apply_per_person" BOOLEAN NOT NULL DEFAULT false,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "sort_order" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "price_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notifications" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "target_account_id" UUID NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "is_read" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "store_settings_store_code_key" ON "store_settings"("store_code");

-- CreateIndex
CREATE UNIQUE INDEX "accounts_login_id_key" ON "accounts"("login_id");

-- CreateIndex
CREATE INDEX "idx_accounts_tenant" ON "accounts"("tenant_id");

-- CreateIndex
CREATE INDEX "idx_user_profiles_tenant" ON "user_profiles"("tenant_id");

-- CreateIndex
CREATE INDEX "idx_comp_plans_tenant" ON "compensation_plans"("tenant_id");

-- CreateIndex
CREATE INDEX "idx_comp_plans_account" ON "compensation_plans"("account_id");

-- CreateIndex
CREATE INDEX "idx_shift_entries_tenant" ON "shift_entries"("tenant_id");

-- CreateIndex
CREATE INDEX "idx_shift_entries_account" ON "shift_entries"("account_id");

-- CreateIndex
CREATE INDEX "idx_punch_events_tenant" ON "punch_events"("tenant_id");

-- CreateIndex
CREATE INDEX "idx_punch_events_account" ON "punch_events"("account_id");

-- CreateIndex
CREATE INDEX "idx_punch_events_date" ON "punch_events"("business_date");

-- CreateIndex
CREATE INDEX "idx_cast_checkouts_tenant" ON "cast_checkouts"("tenant_id");

-- CreateIndex
CREATE INDEX "idx_cast_checkouts_account" ON "cast_checkouts"("account_id");

-- CreateIndex
CREATE INDEX "idx_sales_slips_tenant" ON "sales_slips"("tenant_id");

-- CreateIndex
CREATE INDEX "idx_sales_slips_date" ON "sales_slips"("business_date");

-- CreateIndex
CREATE INDEX "idx_sales_lines_tenant" ON "sales_lines"("tenant_id");

-- CreateIndex
CREATE INDEX "idx_sales_lines_slip" ON "sales_lines"("slip_id");

-- CreateIndex
CREATE INDEX "idx_drink_counts_tenant" ON "drink_counts"("tenant_id");

-- CreateIndex
CREATE INDEX "idx_drink_counts_slip" ON "drink_counts"("slip_id");

-- CreateIndex
CREATE INDEX "idx_drink_counts_cast" ON "drink_counts"("cast_id");

-- CreateIndex
CREATE INDEX "idx_customers_tenant" ON "customers"("tenant_id");

-- CreateIndex
CREATE INDEX "idx_customers_name" ON "customers"("name");

-- CreateIndex
CREATE INDEX "idx_daily_closes_tenant" ON "daily_closes"("tenant_id");

-- CreateIndex
CREATE UNIQUE INDEX "daily_closes_tenant_id_business_date_key" ON "daily_closes"("tenant_id", "business_date");

-- CreateIndex
CREATE INDEX "idx_monthly_closes_tenant" ON "monthly_closes"("tenant_id");

-- CreateIndex
CREATE UNIQUE INDEX "monthly_closes_tenant_id_month_key" ON "monthly_closes"("tenant_id", "month");

-- CreateIndex
CREATE INDEX "idx_change_requests_tenant" ON "change_requests"("tenant_id");

-- CreateIndex
CREATE INDEX "idx_audit_logs_tenant" ON "audit_logs"("tenant_id");

-- CreateIndex
CREATE INDEX "idx_audit_logs_target" ON "audit_logs"("tenant_id", "target_type", "target_id");

-- CreateIndex
CREATE INDEX "idx_audit_logs_created" ON "audit_logs"("created_at");

-- CreateIndex
CREATE INDEX "idx_price_items_tenant" ON "price_items"("tenant_id");

-- CreateIndex
CREATE UNIQUE INDEX "price_items_tenant_id_item_code_key" ON "price_items"("tenant_id", "item_code");

-- CreateIndex
CREATE INDEX "idx_notifications_tenant" ON "notifications"("tenant_id");

-- CreateIndex
CREATE INDEX "idx_notifications_target" ON "notifications"("target_account_id");

-- CreateIndex
CREATE INDEX "idx_notifications_unread" ON "notifications"("target_account_id", "is_read");

-- AddForeignKey
ALTER TABLE "store_settings" ADD CONSTRAINT "store_settings_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("tenant_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "accounts" ADD CONSTRAINT "accounts_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("tenant_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_profiles" ADD CONSTRAINT "user_profiles_account_id_fkey" FOREIGN KEY ("account_id") REFERENCES "accounts"("account_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "compensation_plans" ADD CONSTRAINT "compensation_plans_account_id_fkey" FOREIGN KEY ("account_id") REFERENCES "accounts"("account_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shift_entries" ADD CONSTRAINT "shift_entries_account_id_fkey" FOREIGN KEY ("account_id") REFERENCES "accounts"("account_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "punch_events" ADD CONSTRAINT "punch_events_account_id_fkey" FOREIGN KEY ("account_id") REFERENCES "accounts"("account_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cast_checkouts" ADD CONSTRAINT "cast_checkouts_account_id_fkey" FOREIGN KEY ("account_id") REFERENCES "accounts"("account_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cast_checkouts" ADD CONSTRAINT "cast_checkouts_set_by_account_id_fkey" FOREIGN KEY ("set_by_account_id") REFERENCES "accounts"("account_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sales_slips" ADD CONSTRAINT "sales_slips_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "customers"("customer_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sales_slips" ADD CONSTRAINT "sales_slips_main_cast_id_fkey" FOREIGN KEY ("main_cast_id") REFERENCES "accounts"("account_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sales_slips" ADD CONSTRAINT "sales_slips_closed_by_fkey" FOREIGN KEY ("closed_by") REFERENCES "accounts"("account_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sales_lines" ADD CONSTRAINT "sales_lines_slip_id_fkey" FOREIGN KEY ("slip_id") REFERENCES "sales_slips"("slip_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "drink_counts" ADD CONSTRAINT "drink_counts_slip_id_fkey" FOREIGN KEY ("slip_id") REFERENCES "sales_slips"("slip_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "drink_counts" ADD CONSTRAINT "drink_counts_cast_id_fkey" FOREIGN KEY ("cast_id") REFERENCES "accounts"("account_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "customers" ADD CONSTRAINT "customers_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("tenant_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "daily_closes" ADD CONSTRAINT "daily_closes_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("tenant_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "daily_closes" ADD CONSTRAINT "daily_closes_closed_by_fkey" FOREIGN KEY ("closed_by") REFERENCES "accounts"("account_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "monthly_closes" ADD CONSTRAINT "monthly_closes_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("tenant_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "monthly_closes" ADD CONSTRAINT "monthly_closes_closed_by_fkey" FOREIGN KEY ("closed_by") REFERENCES "accounts"("account_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "change_requests" ADD CONSTRAINT "change_requests_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("tenant_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "change_requests" ADD CONSTRAINT "change_requests_requested_by_fkey" FOREIGN KEY ("requested_by") REFERENCES "accounts"("account_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "change_requests" ADD CONSTRAINT "change_requests_approved_by_fkey" FOREIGN KEY ("approved_by") REFERENCES "accounts"("account_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("tenant_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_actor_account_id_fkey" FOREIGN KEY ("actor_account_id") REFERENCES "accounts"("account_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "price_items" ADD CONSTRAINT "price_items_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("tenant_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_target_account_id_fkey" FOREIGN KEY ("target_account_id") REFERENCES "accounts"("account_id") ON DELETE RESTRICT ON UPDATE CASCADE;
