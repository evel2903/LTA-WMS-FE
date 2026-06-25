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
    title: 'Đang tải nội dung',
    message: 'Màn hình đang chuẩn bị dữ liệu mới nhất.',
    role: 'status',
    icon: Loader2,
  },
  empty: {
    title: 'Chưa có bản ghi',
    message: 'Điều chỉnh bộ lọc hoặc tạo bản ghi khi quy trình cho phép.',
    role: 'status',
    icon: PackageOpen,
  },
  error: {
    title: 'Không thể tải màn hình',
    message: 'Vui lòng thử lại hoặc liên hệ hỗ trợ nếu lỗi tiếp diễn.',
    role: 'alert',
    icon: AlertCircle,
  },
  forbidden: {
    title: 'Cần quyền truy cập',
    message: 'Bạn không có quyền xem hoặc thay đổi màn hình này.',
    role: 'alert',
    icon: Lock,
  },
  blocked: {
    title: 'Bị chặn bởi kiểm soát quy trình',
    message: 'Xử lý điều kiện đang chặn trước khi tiếp tục.',
    role: 'alert',
    icon: AlertTriangle,
  },
  readOnly: {
    title: 'Chế độ chỉ đọc',
    message: 'Các thao tác đã bị tắt vì bản ghi hiện tại không thể thay đổi.',
    role: 'status',
    icon: Lock,
  },
  notFound: {
    title: 'Không tìm thấy bản ghi',
    message: 'Bản ghi đã chọn không tồn tại hoặc không còn khả dụng.',
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
