import { useEffect, type ReactNode } from 'react';

import { GovernanceStateBanner } from '@shared/Components/Page/GovernanceStateBanner';
import { ListPageShell } from '@shared/Components/Page/ListPageShell';
import type { PageBoundaryState } from '@shared/Components/Page/PageStateBoundary';
import { Button } from '@shared/Components/Ui/Button';
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
  mobileLabel?: string;
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
  /** Entity-specific empty-state copy (e.g. "Chưa có chủ hàng."). */
  emptyLabel?: string;
  /** Whether the user may create; surfaces a read-only hint when false. */
  canCreate?: boolean;
  readOnlyTitle?: string;
  readOnlyMessage?: string;
  /** Filter toolbar (inputs, selects) rendered above the table. */
  toolbar?: ReactNode;
  /** Action slot rendered in the header (e.g. a "New" toggle). */
  headerAction?: ReactNode;
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
  readOnlyTitle,
  readOnlyMessage,
  toolbar,
  headerAction,
}: CatalogListViewProps<TRow>) {
  return (
    <ListPageShell
      title={title}
      description={description}
      toolbar={headerAction}
      filters={toolbar}
      filtersAriaLabel={`Bộ lọc ${title}`}
      contentAriaLabel={`Danh sách ${title}`}
      state={toBoundaryState(state)}
      stateTitle={stateTitle(state, title)}
      stateMessage={stateMessage({ state, title, errorMessage, emptyLabel })}
      pagination={
        <CatalogPagination
          page={page}
          totalPages={totalPages}
          onPageChange={onPageChange}
        />
      }
    >
      {!canCreate ? (
        <div role="status">
          <GovernanceStateBanner
            state="readOnly"
            title={readOnlyTitle ?? 'Chỉ đọc'}
            message={readOnlyMessage ?? 'Bạn chỉ có quyền xem dữ liệu trong phạm vi này.'}
          />
        </div>
      ) : null}
      {state === 'ready' ? (
        <ResponsiveCatalogRows columns={columns} rows={rows} rowKey={rowKey} />
      ) : null}
    </ListPageShell>
  );
}

function ResponsiveCatalogRows<TRow>({
  columns,
  rows,
  rowKey,
}: {
  columns: CatalogColumn<TRow>[];
  rows: TRow[];
  rowKey: (row: TRow) => string;
}) {
  return (
    <>
      <div className="border-border bg-card hidden rounded-lg border md:block">
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
      </div>

      <div className="grid gap-3 md:hidden" data-catalog-mobile-list>
        {rows.map((row) => (
          <article
            key={rowKey(row)}
            className="border-border bg-card grid gap-3 rounded-lg border p-3"
            data-catalog-mobile-row
          >
            {columns.map((column) => (
              <div key={column.header} className="grid min-w-0 gap-1">
                <span className="text-muted-foreground text-xs font-medium">
                  {column.mobileLabel ?? column.header}
                </span>
                <div className="min-w-0 break-words text-sm">{column.render(row)}</div>
              </div>
            ))}
          </article>
        ))}
      </div>
    </>
  );
}

function CatalogPagination({
  page,
  totalPages,
  onPageChange,
}: {
  page: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}) {
  const normalizedTotalPages = Number.isFinite(totalPages) ? Math.trunc(totalPages) : 1;
  const normalizedPage = Number.isFinite(page) ? Math.trunc(page) : 1;
  const safeTotalPages = Math.max(normalizedTotalPages, 1);
  const safePage = Math.min(Math.max(normalizedPage, 1), safeTotalPages);

  useEffect(() => {
    if (page !== safePage) {
      onPageChange(safePage);
    }
  }, [onPageChange, page, safePage]);

  return (
    <div className="flex w-full flex-wrap items-center justify-between gap-3">
      <span className="text-muted-foreground text-sm">
        Trang {safePage} / {safeTotalPages}
      </span>
      <div className="flex gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={safePage <= 1}
          onClick={() => onPageChange(safePage - 1)}
        >
          Trước
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={safePage >= safeTotalPages}
          onClick={() => onPageChange(safePage + 1)}
        >
          Tiếp
        </Button>
      </div>
    </div>
  );
}

function toBoundaryState(state: CatalogListState): PageBoundaryState | null {
  switch (state) {
    case 'loading':
      return 'loading';
    case 'empty':
      return 'empty';
    case 'error':
      return 'error';
    case 'denied':
      return 'forbidden';
    case 'ready':
      return null;
    default:
      return null;
  }
}

function stateTitle(state: CatalogListState, title: string) {
  switch (state) {
    case 'loading':
      return `Đang tải ${title.toLowerCase()}`;
    case 'empty':
      return 'Chưa có dữ liệu';
    case 'error':
      return `Không thể tải ${title.toLowerCase()}`;
    case 'denied':
      return 'Không có quyền';
    default:
      return undefined;
  }
}

function stateMessage({
  state,
  title,
  errorMessage,
  emptyLabel,
}: {
  state: CatalogListState;
  title: string;
  errorMessage?: string;
  emptyLabel?: string;
}) {
  switch (state) {
    case 'loading':
      return `Đang tải ${title.toLowerCase()}...`;
    case 'empty':
      return emptyLabel ?? 'Không tìm thấy bản ghi.';
    case 'error':
      return errorMessage ?? 'Đã xảy ra lỗi API không mong muốn.';
    case 'denied':
      return `Bạn không có quyền xem ${title.toLowerCase()} trong phạm vi này.`;
    default:
      return undefined;
  }
}
