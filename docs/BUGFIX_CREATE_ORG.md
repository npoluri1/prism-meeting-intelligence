# Bug Fix: Create Organization Silent Failure

## What Was Broken

Clicking "New organization" in the sidebar workspace switcher, typing a name,
and hitting "Create" had no visible effect. The button would briefly show "…"
and then reset — no new workspace appeared, no error was shown.

## Why It Was Broken

`frontend/src/components/Sidebar.tsx` — `handleCreateOrg` function:

```typescript
// BEFORE (broken)
try {
  const org = await createOrganization(newOrgName.trim())
  setOrgs((prev) => [...prev, org])
  onOrgChange(org.id)
  setShowNewOrg(false)
  setNewOrgName('')
} catch {
  // silent   ← swallowed every error
} finally {
  setCreating(false)
}
```

The `catch` block was completely empty. Any failure — 401 unauthorized,
422 validation error, 500 server error, network timeout — was swallowed
silently. The user received no feedback that anything went wrong.

Secondary issue: the Sidebar linked to `/org/:orgId/settings` but that
route did not exist in `App.tsx`, causing a silent navigation to the
wildcard catch-all redirect.

## What Was Changed

### `frontend/src/components/Sidebar.tsx`
- Imported `useToast` from the new `Toast` component
- `catch` block now calls `toast.error(message)` with the actual API error detail
- Added industry selector to the create form (useful for org-scoped templates)
- "Create" button disabled when name is empty
- Success shows `toast.success('Workspace "X" created')`

```typescript
// AFTER (fixed)
} catch (err) {
  const msg = err instanceof ApiError ? err.detail : 'Failed to create workspace'
  toast.error(msg)
} finally {
  setCreating(false)
}
```

### `frontend/src/components/Toast.tsx` (new)
Global toast notification system wrapping the app via `ToastProvider` in `main.tsx`.
Provides `useToast()` hook with `.success()`, `.error()`, `.info()` methods.
Toasts auto-dismiss after 4 seconds.

### `frontend/src/App.tsx`
Added the missing `/org/:orgId/settings` route pointing to the new `OrgSettingsPage`.

### `frontend/src/pages/OrgSettingsPage.tsx` (new)
Organization settings page covering: name/industry/size/website editing,
plan display, calendar integrations, and danger zone.

## How This Is Prevented Going Forward

**Rule added to CLAUDE.md:**
> Every catch block must call `toast.error(...)` with the actual message.
> Never `catch { // silent }`.

**Toast system enforces visibility** — all error-state UI now routes through
`useToast`, making silent failures structurally impossible when the convention
is followed.
