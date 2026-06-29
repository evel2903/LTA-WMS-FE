import type { ReactNode } from 'react';

import { Alert, AlertDescription, AlertTitle } from '@shared/Components/Reui/alert';
import { Button } from '@shared/Components/Ui/Button';
import { Card, CardContent } from '@shared/Components/Ui/Card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@shared/Components/Ui/Table';

export type CatalogListState = 'loading' | 'empty' | 'ready' | 'error' | 'denied';

export interface CatalogColumn<TRow> {
  header: string;
  render: (row: TRow) => ReactNode;
  className?: string;
}

interface CatalogListViewProps<TRow> {
  title: string;
  description?: string;
  state: CatalogListState;
  columns: CatalogColumn<TRow>[];
  rows: TRow[];
  rowKey: (row: TRow) => string;
  page: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  errorMessage?: string;
  /** Entity-specific empty-state copy (e.g. "No Owners yet."). */
  emptyLabel?: string;
  /** Whether the user may create — surfaces a read-only hint when false. */
  canCreate?: boolean;
  /** Filter toolbar (inputs, selects) rendered above the table. */
  toolbar?: ReactNode;
  /** Action slot rendered in the header (e.g. a "New" toggle). */
  headerAction?: ReactNode;
}

function PageHeader({
  title,
  description,
  headerAction,
}: {
  title: string;
  description?: string;
  headerAction?: ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
        {description && <p className="text-muted-foreground">{description}</p>}
      </div>
      {headerAction}
    </div>
  );
}

export function CatalogListView<TRow>({
  title,
  description,
  state,
  columns,
  rows,
  rowKey,
  page,
  totalPages,
  onPageChange,
  errorMessage,
  emptyLabel,
  canCreate = true,
  toolbar,
  headerAction,
}: CatalogListViewProps<TRow>) {
  if (state === 'denied') {
    return (
      <div className="space-y-6">
        <PageHeader title={title} description={description} />
        <Alert role="status" variant="warning">
          <AlertTitle>Không có quyền</AlertTitle>
          <AlertDescription>
            Bạn không có quyền xem {title.toLowerCase()} trong phạm vi này.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  if (state === 'error') {
    return (
      <div className="space-y-6">
        <PageHeader title={title} description={description} />
        <Alert role="alert" variant="destructive">
          <AlertTitle>Không thể tải {title.toLowerCase()}</AlertTitle>
          <AlertDescription>
            {errorMessage ?? 'Đã xảy ra lỗi API không mong muốn.'}
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader title={title} description={description} headerAction={headerAction} />
      {!canCreate && (
        <Alert role="status" variant="info">
          <AlertTitle>Chỉ đọc</AlertTitle>
          <AlertDescription>Bạn chỉ có quyền xem dữ liệu trong phạm vi này.</AlertDescription>
        </Alert>
      )}
      {toolbar && <div className="flex flex-wrap items-end gap-3">{toolbar}</div>}
      <Card>
        <CardContent className="py-2">
          {state === 'loading' ? (
            <p className="text-muted-foreground py-10 text-sm">Đang tải {title.toLowerCase()}...</p>
          ) : state === 'empty' ? (
            <div className="py-6">
              <Alert role="status" variant="info">
                <AlertDescription>{emptyLabel ?? 'Không tìm thấy bản ghi.'}</AlertDescription>
              </Alert>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  {columns.map((column) => (
                    <TableHead key={column.header} className={column.className}>
                      {column.header}
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((row) => (
                  <TableRow key={rowKey(row)}>
                    {columns.map((column) => (
                      <TableCell key={column.header} className={column.className}>
                        {column.render(row)}
                      </TableCell>
                    ))}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
      <div className="flex items-center justify-between">
        <span className="text-muted-foreground text-sm">
          Trang {page} / {Math.max(totalPages, 1)}
        </span>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={page <= 1}
            onClick={() => onPageChange(page - 1)}
          >Trước</Button>
          <Button
            variant="outline"
            size="sm"
            disabled={page >= totalPages}
            onClick={() => onPageChange(page + 1)}
          >Tiếp</Button>
        </div>
      </div>
    </div>
  );
}
