import { Card, CardContent, CardHeader, CardTitle } from '@shared/Components/Ui/Card';

export type FoundationOverviewViewState = 'loading' | 'empty' | 'ready' | 'error' | 'denied';

interface FoundationOverviewStateViewProps {
  state: Exclude<FoundationOverviewViewState, 'ready'>;
  errorMessage?: string;
}

export function FoundationOverviewStateView({
  state,
  errorMessage,
}: FoundationOverviewStateViewProps) {
  if (state === 'denied') {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Permission denied</CardTitle>
        </CardHeader>
        <CardContent className="text-muted-foreground text-sm">
          You do not have permission to view Foundation readiness for the current scope.
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
          {errorMessage ?? 'Unable to load Foundation readiness.'}
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
        No Foundation data is visible in the current scope.
      </CardContent>
    </Card>
  );
}

export function NoDataScopeWarning({ message }: { message: string }) {
  return (
    <div className="rounded-md border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900">
      {message}
    </div>
  );
}
