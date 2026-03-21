# Doc-46 Audit Search API

## 1. Purpose
This endpoint provides operational search over structured audit logs.
It is designed for production incident investigation by support, finance, and operators.

## 2. Endpoint
- `GET /admin/audit-logs`

## 3. Permissions
- Allowed roles: `Admin`, `SystemAdmin`
- Tenant boundary:
  - `Admin` can search only within their own tenant
  - `SystemAdmin` can search across tenants
  - Tenant mismatch uses standard `TENANT_MISMATCH` error

## 4. Supported Filters
Required behavior:
- `from` (date/time)
- `to` (date/time)
- `action`
- `actorId`
- `tenantId`
- `requestId` (exact match)
- `correlationId` (exact match)

Optional:
- `resourceType`
- `resourceId`
- `page` (default: `1`)
- `limit` (default: `20`, max: `100`)

## 5. Validation Rules
- `from` and `to` must be valid dates
- `from > to` returns `422`
- `limit` must be a positive integer and must not exceed `100`
- `action` must match `^[A-Z0-9_]+$` (invalid format returns `422`)
- `requestId` and `correlationId` are exact-match filters

## 6. Sorting and Pagination
- Sort order: `createdAt` descending
- Pagination: offset-based (`page`, `limit`)
- Response includes `total` count for the current filter set

## 7. Response Contract
Uses the common API envelope.

Success:
```json
{
  "success": true,
  "data": {
    "items": [
      {
        "id": "log-001",
        "action": "APPROVE_MONTHLY_UNLOCK",
        "actorId": "admin-001",
        "actorRole": "Admin",
        "tenantId": "tenant-aaa",
        "resourceType": "MonthlyClose",
        "resourceId": "close-001",
        "beforeData": { "status": "closed" },
        "afterData": { "snapshot": { "status": "open" } },
        "correlationId": "corr-001",
        "createdAt": "2026-03-21T12:00:00.000Z",
        "ipAddress": "10.0.0.1",
        "userAgent": "Mozilla/5.0"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 123
    }
  },
  "meta": {
    "correlationId": "corr-001"
  }
}
```

Error:
- Uses the existing common error format:
  - `success: false`
  - `error.code`
  - `error.message`
  - `error.correlationId`
  - optional `error.field`

## 8. Example Queries
- List latest logs (default pagination):
  - `GET /admin/audit-logs`
- Filter by date range and action:
  - `GET /admin/audit-logs?from=2026-03-01T00:00:00Z&to=2026-03-31T23:59:59Z&action=APPROVE_MONTHLY_UNLOCK`
- Filter by request/correlation for incident tracing:
  - `GET /admin/audit-logs?requestId=req-123`
  - `GET /admin/audit-logs?correlationId=corr-123`
- System-wide tenant investigation (SystemAdmin only):
  - `GET /admin/audit-logs?tenantId=tenant-bbb&page=1&limit=50`

## 9. Known Limitations
- Uses offset pagination (`page`, `limit`), which may be less efficient at very high offsets
- No dedicated API/UI for saved searches yet
- Action filter validates format, not a centralized enum registry
