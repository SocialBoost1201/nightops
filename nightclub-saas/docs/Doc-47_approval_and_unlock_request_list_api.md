# Doc-47 Approval and Unlock Request List APIs

## 1. Purpose
NightOps already supports 4-eyes monthly unlock request/approve/reject actions.
This document defines workflow-oriented read APIs that make pending approvals and unlock history operationally usable in production.

## 2. Endpoints
- `GET /admin/approvals/pending`
- `GET /admin/unlock-requests`

Both endpoints use the existing unified response envelope.

## 3. Permissions and Tenant Rules
Allowed roles:
- `Admin`
- `SystemAdmin`

Tenant boundary:
- `Admin` can read only records in their own tenant.
- `SystemAdmin` can read across tenants.
- `tenantId` filter is accepted.
  - For `Admin`, tenant mismatch is blocked by standard `TENANT_MISMATCH` error.
  - For `SystemAdmin`, tenant filtering is supported for scoped investigation.

## 4. GET /admin/approvals/pending

### 4.1 Purpose
Returns approval items that are currently actionable.
Current scope in this phase:
- Monthly unlock requests in `PENDING` state.

### 4.2 Supported Filters
- `type` (currently supports `MONTHLY_UNLOCK`)
- `from`
- `to`
- `page` (default `1`)
- `limit` (default `20`, max `100`)
- `tenantId` (role-constrained as described above)

### 4.3 Sorting and Pagination
- Sort order: `createdAt` ascending (oldest pending first)
- Pagination: offset-based (`page`, `limit`)

### 4.4 Response Item Shape
```json
{
  "id": "unlock-001",
  "type": "MONTHLY_UNLOCK",
  "tenantId": "tenant-aaa",
  "month": "2026-03",
  "requesterId": "user-001",
  "reason": "Need to correct monthly data",
  "status": "PENDING",
  "createdAt": "2026-03-01T10:00:00.000Z",
  "correlationId": "corr-001",
  "summary": {
    "month": "2026-03"
  }
}
```

## 5. GET /admin/unlock-requests

### 5.1 Purpose
Returns unlock request history for operations, audit review, and management UI visibility.

### 5.2 Supported Filters
- `status` (`PENDING`, `APPROVED`, `REJECTED`)
- `month` (`YYYY-MM`)
- `requesterId`
- `approverId`
- `from`
- `to`
- `page` (default `1`)
- `limit` (default `20`, max `100`)
- `tenantId` (role-constrained as described above)

### 5.3 Sorting and Pagination
- Sort order: `createdAt` descending
- Pagination: offset-based (`page`, `limit`)

### 5.4 Response Item Shape
```json
{
  "id": "unlock-002",
  "tenantId": "tenant-aaa",
  "month": "2026-02",
  "requesterId": "user-010",
  "approverId": "admin-002",
  "rejectorId": null,
  "reason": "Backdated correction",
  "status": "APPROVED",
  "createdAt": "2026-03-02T10:00:00.000Z",
  "approvedAt": "2026-03-03T10:00:00.000Z",
  "rejectedAt": null,
  "correlationId": "corr-approve-002"
}
```

## 6. Validation Rules
Applied to both endpoints where relevant:
- `from` / `to` must be valid date values
- `from > to` returns `422`
- `page` / `limit` must be positive integers
- `limit` must be `<= 100`
- Invalid `type` value returns `422`
- Invalid `status` value returns `422`
- Invalid `month` format returns `422`

## 7. Unified Response Contract
Success example:
```json
{
  "success": true,
  "data": {
    "items": [],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 0
    }
  },
  "meta": {
    "correlationId": "corr-001"
  }
}
```

Error example:
```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_INVALID_RANGE",
    "message": "limit must be less than or equal to 100",
    "correlationId": "corr-001",
    "field": "limit"
  }
}
```

## 8. Intended UI Usage
Typical management UI usage:
- Pending approval widget:
  - call `GET /admin/approvals/pending`
  - show oldest pending items first for timely handling
- Unlock request history table:
  - call `GET /admin/unlock-requests`
  - filter by `status`, `month`, requester/approver, and date range

## 9. Known Limitations
- Pending approval endpoint currently includes only `MONTHLY_UNLOCK` type.
- Pagination is offset-based and may be less efficient at very high offsets.
- No dedicated saved-search or advanced search profile API yet.

## 10. Extension Path
`GET /admin/approvals/pending` response uses generic workflow fields (`type`, `summary`) so it can be extended later to include:
- Sales change request approvals
- Shift approvals
- Additional financial approval workflows

Extension guideline:
- Keep item shape backward-compatible.
- Add new `type` values with strict validation.
- Preserve tenant boundary and unified pagination contract.
