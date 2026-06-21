export type LocationProfileViewState = 'loading' | 'empty' | 'ready' | 'error' | 'denied';

interface LocationProfileStateViewProps {
  state: Exclude<LocationProfileViewState, 'ready'>;
  errorMessage?: string;
}

export function LocationProfileStateView({ state, errorMessage }: LocationProfileStateViewProps) {
  const title =
    state === 'denied'
      ? 'Permission denied'
      : state === 'error'
        ? 'Unable to load location profiles'
        : state === 'loading'
          ? 'Loading location profiles'
          : 'No location profiles';
  const message =
    state === 'denied'
      ? 'You do not have permission to view location profiles for this scope.'
      : state === 'error'
        ? (errorMessage ?? 'An unexpected API error occurred.')
        : state === 'loading'
          ? 'Loading location profiles...'
          : 'No location profiles match the current filters.';

  return (
    <div className="space-y-2 py-10">
      <h2 className="text-base font-medium">{title}</h2>
      <p
        className={state === 'error' ? 'text-destructive text-sm' : 'text-muted-foreground text-sm'}
      >
        {message}
      </p>
    </div>
  );
}
