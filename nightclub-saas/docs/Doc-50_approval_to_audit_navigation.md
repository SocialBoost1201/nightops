# Doc-50 Approval to Audit Navigation

## 1. Purpose
This note documents the workflow connection between approval handling screens and the audit investigation UI.
The goal is to let operators move from a workflow record directly into a narrowed audit search with relevant traceability filters pre-applied.

## 2. Connected Screens
- `/approvals/pending`
- `/approvals/unlock-requests`
- `/audit-logs`

## 3. Added Navigation

### 3.1 Pending Approvals
Each pending approval row now includes an audit navigation link:
- label: `監査ログを見る`
- target: `/audit-logs`

Applied query strategy:
- `requestId` uses the approval request identifier
- `correlationId` is included when available
- `action=REQUEST_MONTHLY_UNLOCK`
- `source=pending-approvals`

Example:
- `/audit-logs?requestId=req-001&correlationId=corr-001&action=REQUEST_MONTHLY_UNLOCK&source=pending-approvals`

### 3.2 Unlock Request History
Each unlock history row now includes an audit navigation link:
- label: `監査ログを見る`
- target: `/audit-logs`

Applied query strategy:
- `requestId` uses the unlock request identifier
- `correlationId` is included when available
- `action` is mapped from status:
  - `PENDING` -> `REQUEST_MONTHLY_UNLOCK`
  - `APPROVED` -> `APPROVE_MONTHLY_UNLOCK`
  - `REJECTED` -> `REJECT_MONTHLY_UNLOCK`
- `source=unlock-request-history`

## 4. Audit Log Query Prefill Behavior
The audit log page now reads supported filters from the URL on initial load and on query updates.

Supported URL-driven filters:
- `requestId`
- `correlationId`
- `actorId`
- `action`
- `from`
- `to`
- `tenantId`
- `resourceType`
- `resourceId`
- `page`
- `limit`

Behavior:
- matching controls are prefilled from query params
- SWR fetch runs immediately using those values
- filtered helper banner is shown when linked traceability context exists
- `Reset filters` clears both UI state and URL-driven context

## 5. Operator UX Notes
- approval handling and audit investigation now behave as one connected flow
- operators can pivot from a request record directly into audit evidence
- audit page explicitly indicates when the current list is a narrowed traceability view

## 6. Manual Verification
1. From `/approvals/pending`, click `監査ログを見る` and confirm the audit page opens with request/correlation filters prefilled.
2. From `/approvals/unlock-requests`, click `監査ログを見る` and confirm the audit page opens with request/correlation/action filters prefilled.
3. Confirm audit page fetches automatically on first load with URL filters.
4. Confirm `Reset filters` clears the active URL query and returns to the default audit list state.
5. Confirm existing approve/reject behavior is unchanged.

## 7. Known Limitations
- audit prefiltering relies on frontend-known action naming for unlock workflow
- the linked helper banner is contextual but does not yet include a back-link to the source row

## 8. Future Extension
- add back-navigation preserving approval page state
- add deep-link support from audit details back into workflow records
- expand the same navigation pattern to future approval types
