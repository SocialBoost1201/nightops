CREATE TABLE unlock_requests (
  unlock_request_id UUID PRIMARY KEY,
  tenant_id UUID NOT NULL,
  month VARCHAR(7) NOT NULL,
  requester_id UUID NOT NULL,
  approver_id UUID NULL,
  reason TEXT NOT NULL,
  status VARCHAR(20) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  approved_at TIMESTAMPTZ NULL,
  CONSTRAINT fk_unlock_requests_tenant
    FOREIGN KEY (tenant_id) REFERENCES tenants(tenant_id) ON DELETE CASCADE,
  CONSTRAINT fk_unlock_requests_requester
    FOREIGN KEY (requester_id) REFERENCES accounts(account_id),
  CONSTRAINT fk_unlock_requests_approver
    FOREIGN KEY (approver_id) REFERENCES accounts(account_id),
  CONSTRAINT chk_unlock_requests_status
    CHECK (status IN ('PENDING', 'APPROVED', 'REJECTED')),
  CONSTRAINT chk_unlock_requests_month_format
    CHECK (month ~ '^[0-9]{4}-(0[1-9]|1[0-2])$'),
  CONSTRAINT chk_unlock_requests_approver_required_for_approved
    CHECK (status <> 'APPROVED' OR (approver_id IS NOT NULL AND approved_at IS NOT NULL)),
  CONSTRAINT chk_unlock_requests_requester_approver_diff
    CHECK (approver_id IS NULL OR approver_id <> requester_id)
);

CREATE INDEX idx_unlock_requests_tenant_month
  ON unlock_requests (tenant_id, month);

CREATE INDEX idx_unlock_requests_tenant_status
  ON unlock_requests (tenant_id, status);

CREATE UNIQUE INDEX uq_unlock_requests_pending_by_month
  ON unlock_requests (tenant_id, month)
  WHERE status = 'PENDING';
