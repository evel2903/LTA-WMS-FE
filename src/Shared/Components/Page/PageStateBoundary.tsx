import type { ReactNode } from 'react';
import { AlertCircle, AlertTriangle, FileQuestion, Loader2, Lock, PackageOpen } from 'lucide-react';

import { cn } from '@shared/Utils/Cn';

export type PageBoundaryState =
  | 'loading'
  | 'empty'
  | 'error'
  | 'forbidden'
  | 'readOnly'
  | 'notFound'
  | 'blocked';

export interface PageStateBoundaryProps {
  state?: PageBoundaryState | null;
  title?: string;
  message?: string;
  action?: ReactNode;
  children?: ReactNode;
  className?: string;
}

const stateDefaults: Record<
  PageBoundaryState,
  {
    title: string;
    message: string;
    role: 'status' | 'alert';
    icon: typeof AlertCircle;
  }
> = {
  loading: {
    title: 'Loading content',
    message: 'The page is preparing the latest data.',
    role: 'status',
    icon: Loader2,
  },
  empty: {
    title: 'No records found',
    message: 'Adjust filters or create a record when the workflow allows it.',
    role: 'status',
    icon: PackageOpen,
  },
  error: {
    title: 'Unable to load page',
    message: 'Retry the request or contact support if the problem continues.',
    role: 'alert',
    icon: AlertCircle,
  },
  forbidden: {
    title: 'Permission required',
    message: 'You do not have permission to view or change this page.',
    role: 'alert',
    icon: Lock,
  },
  blocked: {
    title: 'Blocked by workflow control',
    message: 'Resolve the blocking condition before continuing.',
    role: 'alert',
    icon: AlertTriangle,
  },
  readOnly: {
    title: 'Read-only mode',
    message: 'Actions are disabled because the current record cannot be changed.',
    role: 'status',
    icon: Lock,
  },
  notFound: {
    title: 'Record not found',
    message: 'The selected record does not exist or is no longer available.',
    role: 'alert',
    icon: FileQuestion,
  },
};

export function PageStateBoundary({
  state,
  title,
  message,
  action,
  children,
  className,
}: PageStateBoundaryProps) {
  if (!state) return <>{children}</>;

  if (state === 'readOnly') {
    const config = stateDefaults.readOnly;

    return (
      <div className={cn('space-y-4', className)}>
        <div
          role={config.role}
          className="border-border bg-muted text-foreground flex gap-3 rounded-lg border p-4 text-sm"
        >
          <Lock className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
          <div className="min-w-0 space-y-1">
            <p className="font-medium">{title ?? config.title}</p>
            <p className="text-muted-foreground">{message ?? config.message}</p>
          </div>
          {action != null ? <div className="ml-auto flex shrink-0 flex-wrap gap-2">{action}</div> : null}
        </div>
        {children}
      </div>
    );
  }

  const config = stateDefaults[state];
  const Icon = config.icon;

  return (
    <div
      role={config.role}
      className={cn(
        'border-border bg-card text-card-foreground flex min-h-56 flex-col items-center justify-center gap-4 rounded-lg border p-6 text-center',
        className,
      )}
    >
      <Icon
        className={cn('text-muted-foreground size-8', state === 'loading' && 'animate-spin')}
        aria-hidden="true"
      />
      <div className="max-w-md space-y-1">
        <h2 className="text-lg font-semibold">{title ?? config.title}</h2>
        <p className="text-muted-foreground text-sm">{message ?? config.message}</p>
      </div>
      {action != null ? <div className="flex flex-wrap justify-center gap-2">{action}</div> : null}
    </div>
  );
}
