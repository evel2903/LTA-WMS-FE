import { useEffect, type ReactNode } from 'react';
import { ArrowDown, ArrowUp, ArrowUpDown } from 'lucide-react';

import { cn } from '@shared/Utils/Cn';
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
  /** Optional richer value for the mobile card while retaining one shared column definition. */
  mobileRender?: (row: TRow) => ReactNode;
  /** Omits a column from mobile when its information is already composed into another mobile cell. */
  mobileHidden?: boolean;
  className?: string;
  mobileLabel?: string;
  /** Marks this column as sortable — the parent owns the actual comparator via `onSortChange`. */
  sortable?: boolean;
  /** Stable sort key, decoupled from the display text. Required when `sortable: true` — falls back to `header` otherwise. */
  id?: string;
}

export interface CatalogSortState {
  column: string;
  direction: 'asc' | 'desc';
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
  /** Optional server-reported total count shown beside page metadata. */
  totalItems?: number;
  /** Vietnamese entity label for `totalItems` (for example `phiếu`). */
  itemLabel?: string;
  onPageChange: (page: number) => void;
  /** Rows-per-page selector — omit to keep pagination as-is (no selector shown). */
  pageSize?: number;
  onPageSizeChange?: (pageSize: number) => void;
  pageSizeOptions?: number[];
  /** Omit to keep headers non-interactive (no consumer opted in yet). */
  sort?: CatalogSortState | null;
  onSortChange?: (column: string) => void;
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
  totalItems,
  itemLabel,
  onPageChange,
  pageSize,
  onPageSizeChange,
  pageSizeOptions,
  sort,
  onSortChange,
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
          totalItems={totalItems}
          itemLabel={itemLabel}
          onPageChange={onPageChange}
          pageSize={pageSize}
          onPageSizeChange={onPageSizeChange}
          pageSizeOptions={pageSizeOptions}
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
        <ResponsiveCatalogRows
          columns={columns}
          rows={rows}
          rowKey={rowKey}
          sort={sort}
          onSortChange={onSortChange}
        />
      ) : null}
    </ListPageShell>
  );
}

function ResponsiveCatalogRows<TRow>({
  columns,
  rows,
  rowKey,
  sort,
  onSortChange,
}: {
  columns: CatalogColumn<TRow>[];
  rows: TRow[];
  rowKey: (row: TRow) => string;
  sort?: CatalogSortState | null;
  onSortChange?: (column: string) => void;
}) {
  return (
    <>
      <div className="border-border bg-card hidden rounded-lg border md:block">
        <Table containerClassName="max-h-[600px] overflow-y-auto">
          <TableHeader>
            <TableRow>
              {columns.map((column) => {
                const sortKey = column.id ?? column.header;
                const isSortable = column.sortable && onSortChange != null;
                const isActive = sort?.column === sortKey;
                const SortIcon = isActive
                  ? sort?.direction === 'asc'
                    ? ArrowUp
                    : ArrowDown
                  : ArrowUpDown;
                return (
                  <TableHead
                    key={column.header}
                    className={cn('bg-card sticky top-0 z-10', column.className)}
                    aria-sort={
                      isSortable
                        ? isActive
                          ? sort?.direction === 'asc'
                            ? 'ascending'
                            : 'descending'
                          : 'none'
                        : undefined
                    }
                  >
                    {isSortable ? (
                      <button
                        type="button"
                        className="hover:text-foreground inline-flex min-h-10 items-center gap-1 py-2"
                        onClick={() => onSortChange?.(sortKey)}
                      >
                        {column.header}
                        <SortIcon
                          className={cn('size-3.5', isActive ? 'opacity-100' : 'opacity-40')}
                        />
                      </button>
                    ) : (
                      column.header
                    )}
                  </TableHead>
                );
              })}
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
            {columns.map((column) =>
              column.mobileHidden ? null : (
                <div key={column.header} className="grid min-w-0 gap-1">
                  <span className="text-muted-foreground text-xs font-medium">
                    {column.mobileLabel ?? column.header}
                  </span>
                  <div className="min-w-0 break-words text-sm">
                    {typeof column.mobileRender === 'function'
                      ? column.mobileRender(row)
                      : column.render(row)}
                  </div>
                </div>
              ),
            )}
          </article>
        ))}
      </div>
    </>
  );
}

function CatalogPagination({
  page,
  totalPages,
  totalItems,
  itemLabel,
  onPageChange,
  pageSize,
  onPageSizeChange,
  pageSizeOptions,
}: {
  page: number;
  totalPages: number;
  totalItems?: number;
  itemLabel?: string;
  onPageChange: (page: number) => void;
  pageSize?: number;
  onPageSizeChange?: (pageSize: number) => void;
  pageSizeOptions?: number[];
}) {
  const normalizedTotalPages = Number.isFinite(totalPages) ? Math.trunc(totalPages) : 1;
  const normalizedPage = Number.isFinite(page) ? Math.trunc(page) : 1;
  const safeTotalPages = Math.max(normalizedTotalPages, 1);
  const safePage = Math.min(Math.max(normalizedPage, 1), safeTotalPages);
  const safeTotalItems =
    totalItems != null && Number.isFinite(totalItems) ? Math.max(Math.trunc(totalItems), 0) : null;
  const showPageSize = pageSize != null && onPageSizeChange != null;
  const sizeOptions = pageSizeOptions ?? [10, 20, 50, 100];

  useEffect(() => {
    if (page !== safePage) {
      onPageChange(safePage);
    }
  }, [onPageChange, page, safePage]);

  return (
    <div className="flex w-full flex-wrap items-center justify-between gap-3">
      <div className="flex items-center gap-3">
        <span className="text-muted-foreground text-sm">
          Trang {safePage} / {safeTotalPages}
          {safeTotalItems != null ? ` · ${safeTotalItems} ${itemLabel ?? 'bản ghi'}` : ''}
        </span>
        {showPageSize ? (
          <label className="text-muted-foreground flex items-center gap-2 text-sm">
            Số dòng/trang
            <select
              className="h-10 rounded-md border bg-background px-2 text-sm"
              value={pageSize}
              onChange={(event) => onPageSizeChange?.(Number(event.target.value))}
            >
              {sizeOptions.map((size) => (
                <option key={size} value={size}>
                  {size}
                </option>
              ))}
            </select>
          </label>
        ) : null}
      </div>
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
      return errorMessage ?? `Bạn không có quyền xem ${title.toLowerCase()} trong phạm vi này.`;
    default:
      return undefined;
  }
}
