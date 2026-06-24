import type { ReactNode } from 'react';
import { AlertTriangle, CheckCircle2, Info, Lock, ShieldAlert } from 'lucide-react';

import { cn } from '@shared/Utils/Cn';

export type GovernanceState =
  | 'denied'
  | 'readOnly'
  | 'blocked'
  | 'approvalRequired'
  | 'overrideRequired'
  | 'warning'
  | 'missingSetup'
  | 'ready';

export interface GovernanceStateBannerProps {
  state: GovernanceState;
  title?: string;
  message?: string;
  action?: ReactNode;
  className?: string;
}

const bannerDefaults: Record<
  GovernanceState,
  {
    title: string;
    message: string;
    icon: typeof Info;
    className: string;
  }
> = {
  denied: {
    title: 'Permission denied',
    message: 'The requested action is not available for the current user or scope.',
    icon: ShieldAlert,
    className: 'border-destructive/35 bg-destructive/10 text-destructive',
  },
  readOnly: {
    title: 'Read-only state',
    message: 'Actions are disabled, but the record remains available for review.',
    icon: Lock,
    className: 'border-border bg-muted text-foreground',
  },
  blocked: {
    title: 'Blocked by workflow control',
    message: 'Resolve the blocking condition before continuing this action.',
    icon: AlertTriangle,
    className: 'border-amber-300 bg-amber-50 text-amber-950',
  },
  approvalRequired: {
    title: 'Approval required',
    message: 'This action must pass the configured approval flow before it is effective.',
    icon: ShieldAlert,
    className: 'border-blue-300 bg-blue-50 text-blue-950',
  },
  overrideRequired: {
    title: 'Override required',
    message: 'A permitted override and audit reason are required to continue.',
    icon: ShieldAlert,
    className: 'border-violet-300 bg-violet-50 text-violet-950',
  },
  warning: {
    title: 'Review before continuing',
    message: 'Check the current state and audit requirements before taking action.',
    icon: AlertTriangle,
    className: 'border-amber-300 bg-amber-50 text-amber-950',
  },
  missingSetup: {
    title: 'Setup required',
    message: 'Required foundation configuration is missing for this workflow.',
    icon: Info,
    className: 'border-sky-300 bg-sky-50 text-sky-950',
  },
  ready: {
    title: 'Ready',
    message: 'The page is available for the configured workflow.',
    icon: CheckCircle2,
    className: 'border-emerald-300 bg-emerald-50 text-emerald-950',
  },
};

export function GovernanceStateBanner({
  state,
  title,
  message,
  action,
  className,
}: GovernanceStateBannerProps) {
  const config = bannerDefaults[state];
  const Icon = config.icon;

  return (
    <aside
      className={cn('flex flex-col gap-3 rounded-lg border p-4 text-sm sm:flex-row', config.className, className)}
      aria-live={state === 'ready' ? 'polite' : 'assertive'}
    >
      <Icon className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
      <div className="min-w-0 flex-1 space-y-1">
        <p className="font-medium">{title ?? config.title}</p>
        <p className="opacity-85">{message ?? config.message}</p>
      </div>
      {action != null ? (
        <div className="flex w-full min-w-0 flex-wrap items-start gap-2 sm:w-auto sm:shrink-0 sm:justify-end">
          {action}
        </div>
      ) : null}
    </aside>
  );
}
