# Conventions
- Shared UI primitives are exported from app/ui.tsx: PageHeader, Breadcrumb, Alert, EmptyState, LoadingState, ErrorState, Modal, ConfirmDialog, SearchField, StatusBadge, ProgressBar, ToastProvider.
- Client data access should use lib/client-api.ts and surface loading/error/empty states.
- Destructive flows use native dialog wrappers and confirm dialogs; mutations show toast on success and inline errors on failure.
- Assessment drafts persist in browser storage and sync through lib/assessment-workspace.ts; empty score is distinct from zero.
- Interactive controls should use semantic native elements, explicit labels, visible focus ring, and icon-only labels.