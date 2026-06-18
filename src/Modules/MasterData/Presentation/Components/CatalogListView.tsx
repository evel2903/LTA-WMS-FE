import type { ReactNode } from 'react';

import { Button } from '@shared/Components/Ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '@shared/Components/Ui/Card';
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
  canCreate = true,
  toolbar,
  headerAction,
}: CatalogListViewProps<TRow>) {
  if (state === 'denied') {
    return (
      <div className="space-y-6">
        <PageHeader title={title} description={description} />
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Permission denied</CardTitle>
          </CardHeader>
          <CardContent className="text-muted-foreground text-sm">
            You do not have permission to view {title.toLowerCase()} for this scope.
          </CardContent>
        </Card>
      </div>
    );
  }

  if (state === 'error') {
    return (
      <div className="space-y-6">
        <PageHeader title={title} description={description} />
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Unable to load {title.toLowerCase()}</CardTitle>
          </CardHeader>
          <CardContent className="text-destructive text-sm">
            {errorMessage ?? 'An unexpected API error occurred.'}
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader title={title} description={description} headerAction={headerAction} />
      {!canCreate && <p className="text-muted-foreground text-sm">Read only</p>}
      {toolbar && <div className="flex flex-wrap items-end gap-3">{toolbar}</div>}
      <Card>
        <CardContent className="py-2">
          {state === 'loading' ? (
            <p className="text-muted-foreground py-10 text-sm">Loading {title.toLowerCase()}...</p>
          ) : state === 'empty' ? (
            <p className="text-muted-foreground py-10 text-sm">No records found.</p>
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
          Page {page} of {Math.max(totalPages, 1)}
        </span>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={page <= 1}
            onClick={() => onPageChange(page - 1)}
          >
            Previous
          </Button>
          <Button
            variant="outline"
            size="sm"
            disabled={page >= totalPages}
            onClick={() => onPageChange(page + 1)}
          >
            Next
          </Button>
        </div>
      </div>
    </div>
  );
}
