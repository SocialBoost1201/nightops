# Doc-49 Web Admin Audit Log UI

## 1. Route
- `/audit-logs`

## 2. Page Purpose
This page provides an operational investigation UI for NightOps audit events.
It allows Admin and SystemAdmin users to:
- search audit logs quickly with incident-oriented filters
- trace actions by `correlationId` and `requestId`
- inspect `beforeData` / `afterData` snapshots in a readable format

## 3. UI Structure
The page follows a desktop-first management layout:
1. Header (title + short investigation description)
2. Filter bar
3. High-density audit table
4. Pagination footer
5. Detail side panel (opens from row or detail button)

Design direction:
- dark theme aligned with existing web-admin style
- low visual noise and serious operational tone
- readable data-first hierarchy

## 4. Filter Fields
Supported UI filters (mapped to backend `GET /admin/audit-logs`):
- `from`
- `to`
- `action`
- `actorId`
- `tenantId` (SystemAdmin only)
- `requestId`
- `correlationId`
- `resourceType`
- `resourceId`
- `limit`
- `page`

Filter behavior:
- changing any filter resets `page` to `1`
- `Reset` button clears all filter inputs
- `Refresh` button re-fetches using current query

## 5. Table Fields
Main table columns:
- Created At
- Action
- Tenant
- Actor
- Resource Type
- Resource ID
- Correlation ID
- Request ID
- Summary
- Details

Summary behavior:
- human-readable summary is composed on frontend from `action` + known snapshot fields
- examples include monthly unlock approve/reject/request and common financial operations

## 6. Detail Panel Fields
The side panel shows:
- Correlation ID (copy action)
- Request ID (copy action)
- Summary
- Created At
- Action
- Actor / role
- Tenant
- Resource Type / Resource ID
- IP Address / User Agent
- Reason
- Before Snapshot (`beforeData`)
- After Snapshot (`afterData`)
- `afterData.__audit` block when present

Snapshot viewer behavior:
- collapsible JSON sections
- scrollable code block for large payloads
- readable monospace formatting for incident investigation

## 7. Operator Usage Scenarios
1. Incident correlation trace:
   - search by `correlationId`
   - open details and inspect snapshot diff context
2. Request-level investigation:
   - search by `requestId`
   - confirm actor, tenant, and action timeline
3. Financial operation audit:
   - filter by action/resource/date range
   - review before/after values and audit metadata

## 8. Loading / Empty / Error States
Implemented states:
- loading spinner state while fetching
- empty state when no rows match
- error state with retry button

## 9. Role and Tenant Behavior
- Admin:
  - tenant-scoped by backend
  - UI does not display cross-tenant filter control
- SystemAdmin:
  - can search across tenants
  - UI displays `tenantId` filter

## 10. Manual Verification Notes
Manual scenarios verified:
1. list renders with default query
2. filter updates change API query and reset page to 1
3. pagination prev/next changes result page
4. detail panel opens from row and closes correctly
5. before/after snapshot viewers render and toggle
6. copy actions for correlation/request ID trigger toast feedback
7. loading, empty, and error states render as expected

## 11. Known Limitations
- automated UI tests are not yet configured in this app
- filter state is not synchronized to URL query parameters
- row-level diff visualization (before vs after) is not yet implemented (raw JSON view only)

## 12. Future Extension Path
- add URL query synchronization for shareable investigation links
- add structured diff viewer for snapshot changes
- add saved filter presets for recurring incident patterns
- add direct navigation to related workflow screens by correlation context
