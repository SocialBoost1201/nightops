# Doc-45 Financial Audit and Closing

## 1. Objective
This document defines financial governance rules for NightOps API around sales correction, daily close, monthly confirm, and monthly unlock.
The goal is to make every critical financial change traceable, attributable, and auditable.

## 2. Financial Change Rules

Target APIs:
- `PATCH /sales/:id`
- `POST /sales/change-requests/:id/approve`

Requirements:
- `reason` is mandatory for financial updates.
- `before` and `after` snapshots are stored in audit logs.
- `actorId`, `actorRole`, `tenantId`, and `correlationId` are persisted.
- Audit logs are written through `audit.service` in `strict` mode.

Audit actions:
- `UPDATE_SALES_SLIP`
- `APPROVE_SALES_CHANGE_REQUEST`

## 3. Closing and Unlocking

### 3.1 Daily Close
API:
- `POST /reports/close/daily`

Behavior:
- Close by `businessDate`.
- Store snapshot values: `totalSales`, `cashExpected`, `cashActual`, `difference`.
- Keep warning signal when cash difference exists.

Audit action:
- `DAILY_CLOSE`

### 3.2 Monthly Confirm
API:
- `POST /reports/close/monthly`

Behavior:
- Confirm by `month` (`YYYY-MM`).
- Lock monthly period for sales modifications.

Audit action:
- `MONTHLY_CONFIRM`

### 3.3 Monthly Unlock (4-eyes approval)
APIs:
- `POST /reports/close/monthly/unlock/request`
- `POST /reports/close/monthly/unlock/approve`
- `POST /reports/close/monthly/unlock/reject`

Behavior:
- Step 1 creates a pending unlock request.
- Step 2 requires a different approver to execute unlock.
- Unlock is never executed at request creation time.

Audit actions:
- `REQUEST_MONTHLY_UNLOCK`
- `APPROVE_MONTHLY_UNLOCK`
- `REJECT_MONTHLY_UNLOCK`

## 4. Unlock Request Data Model
Table: `unlock_requests`

Columns:
- `unlock_request_id`
- `tenant_id`
- `month`
- `requester_id`
- `approver_id` (nullable)
- `reason`
- `status` (`PENDING`, `APPROVED`, `REJECTED`)
- `created_at`
- `approved_at`

## 5. Lock Rules

Sales update is rejected (`409`) when:
1. `daily_closes.status = closed` for the business date.
2. `monthly_closes.status = closed` for the month.

Date-change dual validation:
- For sales date updates, lock checks run against both:
  - original business date/month
  - target business date/month

This prevents lock bypass by moving data across dates.

## 6. Validation and Error Behavior

### 6.1 Unlock request validation
- `month` is required in `YYYY-MM` format.
- `reason` is required with minimum length 10.
- Missing/invalid `reason` returns `422`.

### 6.2 Unlock approval validation
- `requestId` is required.
- Approver must be different from requester.
- Tenant boundary is enforced.
- Only `Admin` and `SystemAdmin` can request/approve unlock.

### 6.3 Unlock reject validation
- `requestId` is required.
- `reason` is required with minimum length 10.
- Rejector must be different from requester.
- Reject is blocked when request status is already `APPROVED` or `REJECTED`.
- Tenant boundary is enforced.
- Reject does not execute monthly unlock.

### 6.4 Error codes used
- `422` for validation failures (`reason`, `requestId`, format).
- `409` for locked/conflict state or invalid workflow state.
- `403` for tenant boundary violations.

## 7. Audit Contract Enhancements
For monthly unlock actions, audit metadata includes:
- `approvalFlow: "4-eyes"`
- `requestId`

Stored in:
- `afterData.__audit.approvalFlow`
- `afterData.__audit.requestId`

`correlationId` is propagated from request context to all audit entries.

## 8. Sensitive Data Handling
The audit sanitize layer redacts sensitive fields, including:
- `password`
- `passwordHash`
- `token`
- `refreshToken`
- `secret`
- `stripeSecret`
- `authorization`
- `cookie`

## 9. Current Limitations
Out of scope for this phase:
- Multi-approver quorum beyond 4-eyes.
- Approval reason taxonomy and policy engine.
- Dedicated audit search/read API and UI.
