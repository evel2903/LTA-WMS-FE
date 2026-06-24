import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';

import { cn } from '@shared/Utils/Cn';
import { Button } from '@shared/Components/Ui/Button';
import { PageStateBoundary } from '@shared/Components/Page/PageStateBoundary';
import type { PageBoundaryState } from '@shared/Components/Page/PageStateBoundary';

export interface DetailPageShellProps {
  title: string;
  subtitle?: string;
  backTo?: string;
  backLabel?: string;
  status?: ReactNode;
  summary?: ReactNode;
  actions?: ReactNode;
  children?: ReactNode;
  state?: PageBoundaryState | null;
  stateTitle?: string;
  stateMessage?: string;
  stateAction?: ReactNode;
  className?: string;
  contentClassName?: string;
}

export function DetailPageShell({
  title,
  subtitle,
  backTo,
  backLabel = 'Back',
  status,
  summary,
  actions,
  children,
  state,
  stateTitle,
  stateMessage,
  stateAction,
  className,
  contentClassName,
}: DetailPageShellProps) {
  const isBlockingState =
    state === 'loading' ||
    state === 'error' ||
    state === 'forbidden' ||
    state === 'notFound' ||
    state === 'blocked';
  const canShowActions = !isBlockingState && state !== 'readOnly';

  return (
    <div className={cn('space-y-4', className)}>
      {backTo ? (
        <Button asChild variant="ghost" size="sm">
          <Link to={backTo}>
            <ArrowLeft className="size-4" aria-hidden="true" />
            {backLabel}
          </Link>
        </Button>
      ) : null}

      <header className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0 space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-2xl font-semibold">{title}</h1>
            {status != null ? <div className="shrink-0">{status}</div> : null}
          </div>
          {subtitle ? <p className="text-muted-foreground text-sm">{subtitle}</p> : null}
          {summary != null ? (
            <div className="text-muted-foreground flex flex-wrap gap-x-4 gap-y-1 text-sm">{summary}</div>
          ) : null}
        </div>
        {actions != null && canShowActions ? (
          <div className="flex flex-wrap gap-2 lg:justify-end">{actions}</div>
        ) : null}
      </header>

      <section className={cn('space-y-4', contentClassName)} aria-label={`${title} detail`}>
        <PageStateBoundary state={state} title={stateTitle} message={stateMessage} action={stateAction}>
          {children}
        </PageStateBoundary>
      </section>
    </div>
  );
}
