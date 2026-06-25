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
    title: 'Không có quyền',
    message: 'Thao tác yêu cầu không khả dụng cho người dùng hoặc phạm vi hiện tại.',
    icon: ShieldAlert,
    className: 'border-destructive/35 bg-destructive/10 text-destructive',
  },
  readOnly: {
    title: 'Trạng thái chỉ đọc',
    message: 'Các thao tác đã bị tắt, nhưng bản ghi vẫn có thể xem lại.',
    icon: Lock,
    className: 'border-border bg-muted text-foreground',
  },
  blocked: {
    title: 'Bị chặn bởi kiểm soát quy trình',
    message: 'Xử lý điều kiện đang chặn trước khi tiếp tục thao tác này.',
    icon: AlertTriangle,
    className: 'border-amber-300 bg-amber-50 text-amber-950',
  },
  approvalRequired: {
    title: 'Cần phê duyệt',
    message: 'Thao tác này phải đi qua luồng phê duyệt đã cấu hình trước khi có hiệu lực.',
    icon: ShieldAlert,
    className: 'border-blue-300 bg-blue-50 text-blue-950',
  },
  overrideRequired: {
    title: 'Cần ghi đè kiểm soát',
    message: 'Cần quyền ghi đè và lý do kiểm toán để tiếp tục.',
    icon: ShieldAlert,
    className: 'border-violet-300 bg-violet-50 text-violet-950',
  },
  warning: {
    title: 'Kiểm tra trước khi tiếp tục',
    message: 'Kiểm tra trạng thái hiện tại và yêu cầu kiểm toán trước khi thao tác.',
    icon: AlertTriangle,
    className: 'border-amber-300 bg-amber-50 text-amber-950',
  },
  missingSetup: {
    title: 'Thiếu cấu hình',
    message: 'Quy trình này còn thiếu cấu hình nền tảng bắt buộc.',
    icon: Info,
    className: 'border-sky-300 bg-sky-50 text-sky-950',
  },
  ready: {
    title: 'Sẵn sàng',
    message: 'Màn hình đã sẵn sàng cho quy trình đã cấu hình.',
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
