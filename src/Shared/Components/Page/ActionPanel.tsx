import { useId } from 'react';
import type { ReactNode } from 'react';

import { cn } from '@shared/Utils/Cn';
import { GovernanceStateBanner } from '@shared/Components/Page/GovernanceStateBanner';
import type { GovernanceState } from '@shared/Components/Page/GovernanceStateBanner';

export type ActionPanelState = 'idle' | 'pending' | 'error' | 'success' | 'disabled';

export interface ActionPanelProps {
  title: string;
  description?: string;
  children?: ReactNode;
  footer?: ReactNode;
  state?: ActionPanelState;
  stateTitle?: string;
  stateMessage?: string;
  governanceState?: GovernanceState;
  governanceTitle?: string;
  governanceMessage?: string;
  className?: string;
}

const actionStateDefaults: Record<
  Exclude<ActionPanelState, 'idle'>,
  {
    title: string;
    message: string;
    role: 'status' | 'alert';
    className: string;
  }
> = {
  pending: {
    title: 'Đang xử lý thao tác',
    message: 'Thao tác đang được xử lý.',
    role: 'status',
    className: 'border-blue-300 bg-blue-50 text-blue-950',
  },
  error: {
    title: 'Thao tác thất bại',
    message: 'Kiểm tra lỗi và thử lại khi quy trình cho phép.',
    role: 'alert',
    className: 'border-destructive/35 bg-destructive/10 text-destructive',
  },
  success: {
    title: 'Thao tác hoàn tất',
    message: 'Thao tác đã hoàn tất thành công.',
    role: 'status',
    className: 'border-emerald-300 bg-emerald-50 text-emerald-950',
  },
  disabled: {
    title: 'Thao tác bị tắt',
    message: 'Thao tác này không khả dụng ở trạng thái hiện tại.',
    role: 'status',
    className: 'border-border bg-muted text-foreground',
  },
};

export function ActionPanel({
  title,
  description,
  children,
  footer,
  state = 'idle',
  stateTitle,
  stateMessage,
  governanceState,
  governanceTitle,
  governanceMessage,
  className,
}: ActionPanelProps) {
  const generatedId = useId();
  const titleId = `${generatedId}-title`;
  const stateConfig = state === 'idle' ? null : actionStateDefaults[state];
  const lockControls = state === 'pending' || state === 'disabled';

  return (
    <section
      className={cn('border-border bg-card text-card-foreground space-y-4 rounded-lg border p-4', className)}
      aria-labelledby={titleId}
      aria-busy={state === 'pending' ? true : undefined}
      aria-disabled={state === 'disabled' ? true : undefined}
      data-state={state}
    >
      <div className="space-y-1">
        <h2 id={titleId} className="text-base font-semibold">
          {title}
        </h2>
        {description ? <p className="text-muted-foreground text-sm">{description}</p> : null}
      </div>

      {stateConfig ? (
        <div
          role={stateConfig.role}
          className={cn('rounded-md border px-3 py-2 text-sm', stateConfig.className)}
        >
          <p className="font-medium">{stateTitle ?? stateConfig.title}</p>
          <p className="opacity-85">{stateMessage ?? stateConfig.message}</p>
        </div>
      ) : null}

      {governanceState ? (
        <GovernanceStateBanner
          state={governanceState}
          title={governanceTitle}
          message={governanceMessage}
        />
      ) : null}

      {children != null || footer != null ? (
        <fieldset
          disabled={lockControls}
          // `min-w-0`: browsers default `fieldset` to `min-width: min-content`, so without this
          // it refuses to shrink below its content's natural width (e.g. a wide table) and
          // pushes the whole PAGE into horizontal overflow instead of letting the table's own
          // `overflow-x-auto` wrapper take over (Review Finding, re-review round 3).
          className="min-w-0 space-y-4 disabled:cursor-not-allowed disabled:opacity-70"
          aria-disabled={lockControls ? true : undefined}
        >
          {children != null ? <div className="min-w-0 space-y-4">{children}</div> : null}
          {footer != null ? (
            <div className="border-border flex flex-wrap justify-end gap-2 border-t pt-4">{footer}</div>
          ) : null}
        </fieldset>
      ) : null}
    </section>
  );
}
