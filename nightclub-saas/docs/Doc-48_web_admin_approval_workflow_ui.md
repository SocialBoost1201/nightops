# Doc-48 Web Admin Approval Workflow UI

## 1. Purpose
This document defines the operational management UI for monthly unlock approvals in NightOps web admin.
The goal is to make existing workflow APIs safely usable by Admin and SystemAdmin users.

## 2. Routes
- `/approvals/pending`
- `/approvals/unlock-requests`

Both routes are rendered inside the dashboard layout and follow the existing dark, high-density admin table style.

## 3. Page Purposes

### 3.1 Pending Approvals (`/approvals/pending`)
- Show actionable pending approval items (`MONTHLY_UNLOCK` scope for this phase)
- Provide deliberate `Approve` and `Reject` action flow
- Refresh list after successful processing

### 3.2 Unlock Request History (`/approvals/unlock-requests`)
- Show unlock request history for operations and governance review
- Support filtering by workflow-related fields
- Provide correlation-friendly visibility for audit investigation

## 4. UI Structure

Each page follows:
1. Header (title + short operational context)
2. Filter bar
3. Main table
4. Pagination footer
5. State panels (loading / empty / error)

Pending page additionally includes:
- Confirmation modal for approve/reject actions
- Toast feedback for success/failure

## 5. Table Columns

### 5.1 Pending Approvals
- Type
- Month
- Tenant
- Requester
- Reason
- Created At
- Actions

### 5.2 Unlock Request History
- Month
- Status
- Requester
- Approver
- Rejector
- Reason
- Created At
- Approved At
- Rejected At
- Correlation

## 6. Filters

### 6.1 Pending Approvals
- `type`
- `from`
- `to`
- `limit`
- `tenantId` (SystemAdmin only)
- pagination (`page`)

### 6.2 Unlock Request History
- `status`
- `month`
- `requesterId`
- `approverId`
- `from`
- `to`
- `limit`
- `tenantId` (SystemAdmin only)
- pagination (`page`)

## 7. Approve / Reject Action Flow

### 7.1 Approve
1. Operator clicks `Approve`
2. Confirmation modal opens
3. Governance warning is displayed
4. Operator must explicitly confirm via checkbox
5. UI calls `POST /reports/close/monthly/unlock/approve`
6. On success: success toast + list refresh
7. On failure: error toast with API message fallback

### 7.2 Reject
1. Operator clicks `Reject`
2. Confirmation modal opens
3. Request details and reason are shown for review
4. Operator must explicitly confirm via checkbox
5. UI calls `POST /reports/close/monthly/unlock/reject` with `requestId` and request reason
6. On success: success toast + list refresh
7. On failure: error toast with API message fallback

### 7.3 Safety Guard in UI
- If the requester is the current logged-in user, action buttons are hidden and replaced with a guard label.
- Final authorization remains enforced by backend tenant/role and conflict checks.

## 8. Loading / Empty / Error States

Both pages implement:
- Loading state with spinner
- Empty state with operational no-data message
- Error state with retry action

Action processing state:
- Modal confirm button changes to processing state
- Modal close is blocked while request is in-flight

## 9. Role / Tenant UX Handling
- Admin users: tenant filter is not shown
- SystemAdmin users: tenant filter is shown and passed to API
- UI does not bypass backend tenant boundary rules

## 10. Known Limitations
- No dedicated frontend test runner currently configured in `apps/web-admin`.
- Correlation value is displayed as text only (no deep-link panel yet).
- Pending approval type is currently fixed to `MONTHLY_UNLOCK`.

## 11. Manual Verification Notes

Verified scenarios to run manually:
1. Pending list loads and displays table rows.
2. Approve modal opens, requires confirmation, and refreshes list after success.
3. Reject modal opens, shows request details, and refreshes list after success.
4. Failure responses show toast message.
5. Unlock history filters update query and table result.
6. Pagination controls navigate pages on both screens.
7. Loading/empty/error panels render as expected.

## 12. Future Extension Path
- Expand pending list to additional approval types (sales correction, shift approvals).
- Add detail side panel for correlation ID traceability.
- Add reusable query-state sync to URL search params.
- Introduce UI tests (component and E2E) for critical approve/reject flows.
