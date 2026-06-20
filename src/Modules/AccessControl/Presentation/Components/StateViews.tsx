import { Card, CardContent, CardHeader, CardTitle } from '@shared/Components/Ui/Card';

export type AccessViewState = 'loading' | 'empty' | 'ready' | 'error' | 'denied';

interface AccessStateViewProps {
  state: Exclude<AccessViewState, 'ready'>;
  emptyLabel?: string;
  errorMessage?: string;
}

/**
 * Distinct, non-overlapping UI states (AC3): loading / empty / error /
 * permission-denied. The backend (403) is the source of truth for permission —
 * the FE never invents one.
 */
export function AccessStateView({ state, emptyLabel, errorMessage }: AccessStateViewProps) {
  if (state === 'denied') {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Permission denied</CardTitle>
        </CardHeader>
        <CardContent className="text-muted-foreground text-sm">
          You do not have permission to view or manage this resource.
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
