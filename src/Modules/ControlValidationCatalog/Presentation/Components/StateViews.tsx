import { Card, CardContent, CardHeader, CardTitle } from '@shared/Components/Ui/Card';

export type ControlValidationCatalogViewState = 'loading' | 'empty' | 'ready' | 'error' | 'denied';

interface ControlValidationCatalogStateViewProps {
  state: Exclude<ControlValidationCatalogViewState, 'ready'>;
  errorMessage?: string;
}

export function ControlValidationCatalogStateView({
  state,
  errorMessage,
}: ControlValidationCatalogStateViewProps) {
  if (state === 'denied') {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Permission denied</CardTitle>
        </CardHeader>
        <CardContent className="text-muted-foreground text-sm">
          You do not have permission to view the control and validation catalog.
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
          {errorMessage ?? 'Unable to load control and validation catalog.'}
        </CardContent>
      </Card>
    );
  }
  if (state === 'loading') {
    return (
      <Card>
        <CardContent className="text-muted-foreground py-10 text-sm">Loading...</CardContent>
      </Card>
    );
  }
  return (
    <Card>
      <CardContent className="text-muted-foreground py-10 text-sm">
        No control or validation catalog entries are available.
      </CardContent>
    </Card>
  );
}
