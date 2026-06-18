import { Card, CardContent, CardHeader, CardTitle } from '@shared/Components/Ui/Card';

export type ProfileViewState = 'loading' | 'empty' | 'ready' | 'error' | 'denied';

interface ProfileStateViewProps {
  state: Exclude<ProfileViewState, 'ready'>;
  /** Empty-state copy when there is no data but the user has access. */
  emptyLabel?: string;
  /** Error message shown in the error state. */
  errorMessage?: string;
}

/**
 * Distinct, non-overlapping UI states (AC5): loading / empty / error /
 * permission-denied. Conflict is a separate state owned by lifecycle actions and
 * the preview panel, not here, so it is never lumped into the generic error.
 */
export function ProfileStateView({ state, emptyLabel, errorMessage }: ProfileStateViewProps) {
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
