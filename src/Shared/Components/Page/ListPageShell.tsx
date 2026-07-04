import type { ReactNode } from 'react';

import { cn } from '@shared/Utils/Cn';
import { PageStateBoundary } from '@shared/Components/Page/PageStateBoundary';
import type { PageBoundaryState } from '@shared/Components/Page/PageStateBoundary';

export interface ListPageShellProps {
  title: string;
  description?: string;
  toolbar?: ReactNode;
  filters?: ReactNode;
  children?: ReactNode;
  pagination?: ReactNode;
  state?: PageBoundaryState | null;
  stateTitle?: string;
  stateMessage?: string;
  stateAction?: ReactNode;
  filtersAriaLabel?: string;
  contentAriaLabel?: string;
  className?: string;
  contentClassName?: string;
}

export function ListPageShell({
  title,
  description,
  toolbar,
  filters,
  children,
  pagination,
  state,
  stateTitle,
  stateMessage,
  stateAction,
  filtersAriaLabel,
  contentAriaLabel,
  className,
  contentClassName,
}: ListPageShellProps) {
  const isBlockingState =
    state === 'loading' ||
    state === 'error' ||
    state === 'forbidden' ||
    state === 'notFound' ||
    state === 'blocked';
  const canShowActions = !isBlockingState && state !== 'readOnly';
  const canShowControls = !isBlockingState;

  return (
    <div className={cn('space-y-4', className)}>
      <header className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div className="min-w-0 space-y-1">
          <h1 className="text-2xl font-semibold">{title}</h1>
          {description ? <p className="text-muted-foreground text-sm">{description}</p> : null}
        </div>
        {toolbar != null && canShowActions ? <div className="flex flex-wrap gap-2 md:justify-end">{toolbar}</div> : null}
      </header>

      {filters != null && canShowControls ? (
        <section className="border-border bg-card rounded-lg border p-4" aria-label={filtersAriaLabel ?? `${title} filters`}>
          {filters}
        </section>
      ) : null}

      <section className={cn('space-y-4', contentClassName)} aria-label={contentAriaLabel ?? `${title} list`}>
        <PageStateBoundary state={state} title={stateTitle} message={stateMessage} action={stateAction}>
          <div className="min-w-0 overflow-x-auto">{children}</div>
        </PageStateBoundary>
        {pagination != null && canShowControls ? (
          <div className="flex flex-wrap justify-end gap-2">{pagination}</div>
        ) : null}
      </section>
    </div>
  );
}
