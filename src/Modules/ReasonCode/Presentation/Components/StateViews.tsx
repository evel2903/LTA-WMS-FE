import { Card, CardContent, CardHeader, CardTitle } from '@shared/Components/Ui/Card';

export type ReasonCodeViewState = 'loading' | 'empty' | 'ready' | 'error' | 'denied';

interface StateViewProps {
  state: Exclude<ReasonCodeViewState, 'ready'>;
  emptyLabel?: string;
  errorMessage?: string;
}

/** Distinct, non-overlapping UI states (AC4): loading / empty / error / permission-denied. */
export function ReasonCodeStateView({ state, emptyLabel, errorMessage }: StateViewProps) {
  if (state === 'denied') {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Permission denied</CardTitle>
        </CardHeader>
        <CardContent className="text-muted-foreground text-sm">
          You do not have permission to view or manage reason codes.
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
