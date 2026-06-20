import { Card, CardContent, CardHeader, CardTitle } from '@shared/Components/Ui/Card';

export type ComplianceViewState = 'loading' | 'empty' | 'ready' | 'error' | 'denied';

interface ComplianceStateViewProps {
  state: Exclude<ComplianceViewState, 'ready'>;
  emptyLabel?: string;
  errorMessage?: string;
}

/** Distinct, non-overlapping UI states (AC4): loading / empty / error / permission-denied. */
export function ComplianceStateView({ state, emptyLabel, errorMessage }: ComplianceStateViewProps) {
  if (state === 'denied') {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Permission denied</CardTitle>
        </CardHeader>
        <CardContent className="text-muted-foreground text-sm">
          You do not have permission to view this resource for the current scope.
        </CardContent>
      </Card>
    );
  }

  if (state === 'error') {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Something went wrong</CardTitle>
        </CardHeader>
        <CardContent className="text-destructive text-sm">
          {errorMessage ?? 'An unexpected API error occurred.'}
        </CardContent>
      </Card>
    );
  }

  if (state === 'loading') {
    return (
      <Card>
        <CardContent className="text-muted-foreground py-10 text-sm">Loading…</CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent className="text-muted-foreground py-10 text-sm">
        {emptyLabel ?? 'No records yet.'}
      </CardContent>
    </Card>
  );
}

/** Read-only JSON viewer for audit before/after snapshots (no editor — V0). */
export function JsonBlock({ label, value }: { label: string; value: Record<string, unknown> | null }) {
  return (
    <div className="grid gap-1">
      <span className="text-muted-foreground text-xs font-medium">{label}</span>
      <pre className="bg-muted max-h-60 overflow-auto rounded-md p-2 text-xs">
        {value ? JSON.stringify(value, null, 2) : '—'}
      </pre>
    </div>
  );
}
