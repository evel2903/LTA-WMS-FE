import { getNonForbiddenError, queryErrorMessage } from '@shared/Utils/QueryResilience';

export function ListRefetchWarning({ error, hasData }: { error: unknown; hasData: boolean }) {
  if (!hasData || !getNonForbiddenError(error)) {
    return null;
  }

  return (
    <p
      role="status"
      className="border-border bg-muted text-muted-foreground rounded-md border px-3 py-2 text-xs"
    >
      Không làm mới được dữ liệu. Đang hiển thị dữ liệu gần nhất.
    </p>
  );
}

export function DetailQueryAlert({ error, fallback }: { error: unknown; fallback: string }) {
  const nonForbiddenError = getNonForbiddenError(error);
  if (!nonForbiddenError) {
    return null;
  }

  return (
    <p role="alert" className="text-destructive rounded-md border border-destructive/30 px-3 py-2 text-xs">
      {queryErrorMessage(nonForbiddenError, fallback)}
    </p>
  );
}
