import { useId, useState, type ReactNode } from 'react';

import { ListPageShell } from '@shared/Components/Page';
import { Alert, AlertDescription, AlertTitle } from '@shared/Components/Reui/alert';
import { Badge } from '@shared/Components/Ui/Badge';
import { Button } from '@shared/Components/Ui/Button';
import { Input } from '@shared/Components/Ui/Input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@shared/Components/Ui/Table';
import { ApiError } from '@shared/Services/Http/ApiError';
import { useDebouncedValue } from '@shared/Hooks/UseDebouncedValue';
import { useMasterDataMutations } from '@modules/MasterData/Application/Commands/UseMasterDataMutations';
import { useWarehouseTypes } from '@modules/MasterData/Application/Queries/UseWarehouseTypes';
import { MASTER_DATA_DEFAULT_PAGE_SIZE } from '@modules/MasterData/Domain/Constants/MasterDataConstants';
import type { MasterDataStatus, WarehouseType } from '@modules/MasterData/Domain/Types/MasterDataEntities';
import type { UpdateWarehouseTypeInput } from '@modules/MasterData/Domain/Types/MasterDataTree';
import { masterDataStatusVariant } from '@modules/MasterData/Presentation/Components/MasterDataStatusVariant';
import { WarehouseTypeForm } from '@modules/MasterData/Presentation/Forms/WarehouseTypeForm';
import type { WarehouseTypeFormValues } from '@modules/MasterData/Presentation/Forms/MasterDataFormSchemas';

interface Filters {
  status: MasterDataStatus | '';
  warehouseTypeCode: string;
}

const EMPTY_FILTERS: Filters = { status: '', warehouseTypeCode: '' };

function statusLabel(status: MasterDataStatus): string {
  return status === 'Active' ? 'Đang hoạt động' : 'Không hoạt động';
}

function toUpdateWarehouseTypeInput(values: WarehouseTypeFormValues): UpdateWarehouseTypeInput {
  return {
    warehouseTypeName: values.warehouseTypeName,
    description: values.description,
    status: values.status,
    sourceSystem: values.sourceSystem,
    referenceId: values.referenceId,
    reasonCode: values.reasonCode,
  };
}

export function WarehouseTypeCatalogPage() {
  const [filters, setFilters] = useState<Filters>(EMPTY_FILTERS);
  const [page, setPage] = useState(1);
  const [createOpen, setCreateOpen] = useState(false);
  const [editing, setEditing] = useState<WarehouseType | null>(null);
  const debouncedCode = useDebouncedValue(filters.warehouseTypeCode);
  const query = useWarehouseTypes({
    page,
    pageSize: MASTER_DATA_DEFAULT_PAGE_SIZE,
    status: filters.status || undefined,
    warehouseTypeCode: debouncedCode || undefined,
  });
  const mutations = useMasterDataMutations();

  const items = query.data?.items ?? [];
  const meta = query.data;
  const apiError = query.error instanceof ApiError ? query.error : null;
  const state = apiError?.isForbidden
    ? 'forbidden'
    : query.isLoading
      ? 'loading'
      : query.error
        ? 'error'
        : items.length === 0
          ? 'empty'
          : null;

  const patch = (next: Partial<Filters>) => {
    setFilters((current) => ({ ...current, ...next }));
    setPage(1);
  };

  const closeCreate = () => setCreateOpen(false);
  const closeEdit = () => setEditing(null);

  return (
    <>
      <ListPageShell
        title="Danh mục loại kho"
        description="Quản lý taxonomy loại kho dùng cho form kho và cấu hình profile."
        toolbar={
          apiError?.isForbidden ? null : (
            <Button type="button" size="sm" onClick={() => setCreateOpen(true)}>
              Tạo loại kho
            </Button>
          )
        }
        filters={
          <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_220px] md:items-end">
            <label className="grid min-w-0 gap-1 text-sm">
              Mã loại kho
              <Input
                className="min-w-0"
                placeholder="WT-01"
                value={filters.warehouseTypeCode}
                onChange={(event) => patch({ warehouseTypeCode: event.target.value })}
              />
            </label>
            <label className="grid min-w-0 gap-1 text-sm">
              Trạng thái
              <select
                className="h-9 w-full rounded-md border bg-transparent px-3 text-sm"
                value={filters.status}
                onChange={(event) => patch({ status: event.target.value as MasterDataStatus | '' })}
              >
                <option value="">Tất cả</option>
                <option value="Active">Đang hoạt động</option>
                <option value="Inactive">Không hoạt động</option>
              </select>
            </label>
          </div>
        }
        pagination={
          meta ? (
            <>
              <Button
                size="sm"
                variant="outline"
                disabled={page <= 1}
                onClick={() => setPage((value) => Math.max(1, value - 1))}
              >
                Trước
              </Button>
              <Button
                size="sm"
                variant="outline"
                disabled={page >= (meta.totalPages ?? 1)}
                onClick={() => setPage((value) => value + 1)}
              >
                Tiếp
              </Button>
            </>
          ) : null
        }
        state={state}
        stateTitle={
          state === 'forbidden'
            ? 'Không có quyền'
            : state === 'empty'
              ? 'Chưa có loại kho phù hợp'
              : undefined
        }
        stateMessage={apiError?.message ?? (state === 'error' ? 'Không thể tải danh mục loại kho.' : undefined)}
      >
        <WarehouseTypeList items={items} onEdit={setEditing} />
      </ListPageShell>
      <FormModal title="Tạo loại kho" open={createOpen} onClose={closeCreate}>
        <WarehouseTypeForm
          submitLabel="Tạo loại kho"
          pending={mutations.createWarehouseType.isPending}
          onSubmit={(values) => mutations.createWarehouseType.mutate(values, { onSuccess: closeCreate })}
        />
      </FormModal>
      <FormModal title="Cập nhật loại kho" open={editing != null} onClose={closeEdit}>
        {editing ? (
          <WarehouseTypeForm
            key={editing.id}
            initialValue={editing}
            submitLabel="Cập nhật loại kho"
            pending={mutations.updateWarehouseType.isPending}
            onSubmit={(values) =>
              mutations.updateWarehouseType.mutate(
                { id: editing.id, input: toUpdateWarehouseTypeInput(values) },
                { onSuccess: closeEdit },
              )
            }
          />
        ) : null}
      </FormModal>
    </>
  );
}

function WarehouseTypeList({
  items,
  onEdit,
}: {
  items: WarehouseType[];
  onEdit: (item: WarehouseType) => void;
}) {
  return (
    <>
      <div className="hidden rounded-md border md:block">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Mã loại kho</TableHead>
              <TableHead>Tên loại kho</TableHead>
              <TableHead>Mô tả</TableHead>
              <TableHead>Trạng thái</TableHead>
              <TableHead className="text-right">Hành động</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.map((item) => (
              <TableRow key={item.id}>
                <TableCell className="font-medium">{item.warehouseTypeCode}</TableCell>
                <TableCell>{item.warehouseTypeName}</TableCell>
                <TableCell className="max-w-md truncate text-muted-foreground">{item.description ?? '-'}</TableCell>
                <TableCell>
                  <Badge variant={masterDataStatusVariant(item.status)}>{statusLabel(item.status)}</Badge>
                </TableCell>
                <TableCell className="text-right">
                  <Button type="button" size="sm" variant="outline" onClick={() => onEdit(item)}>
                    Sửa
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <div className="grid gap-3 md:hidden">
        {items.map((item) => (
          <article key={item.id} className="rounded-md border bg-card p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="font-semibold">{item.warehouseTypeCode}</div>
                <div className="text-sm">{item.warehouseTypeName}</div>
              </div>
              <Badge variant={masterDataStatusVariant(item.status)}>{statusLabel(item.status)}</Badge>
            </div>
            {item.description ? <p className="mt-3 text-sm text-muted-foreground">{item.description}</p> : null}
            <Button className="mt-4 w-full" type="button" size="sm" variant="outline" onClick={() => onEdit(item)}>
              Sửa
            </Button>
          </article>
        ))}
      </div>
    </>
  );
}

function FormModal({
  title,
  open,
  onClose,
  children,
}: {
  title: string;
  open: boolean;
  onClose: () => void;
  children?: ReactNode;
}) {
  const titleId = useId();

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/40 px-4 py-8">
      <button aria-label="Đóng lớp phủ" className="absolute inset-0 cursor-default" type="button" onClick={onClose} />
      <section
        aria-labelledby={titleId}
        aria-modal="true"
        className="relative z-10 w-full max-w-xl rounded-md border bg-background p-5 shadow-lg"
        role="dialog"
      >
        <div className="mb-4 flex items-center justify-between gap-3">
          <h2 id={titleId} className="text-lg font-semibold">
            {title}
          </h2>
          <Button type="button" variant="ghost" onClick={onClose}>
            Đóng
          </Button>
        </div>
        {children ?? (
          <Alert role="status" variant="warning">
            <AlertTitle>Chưa sẵn sàng</AlertTitle>
            <AlertDescription>Biểu mẫu chưa sẵn sàng.</AlertDescription>
          </Alert>
        )}
      </section>
    </div>
  );
}
