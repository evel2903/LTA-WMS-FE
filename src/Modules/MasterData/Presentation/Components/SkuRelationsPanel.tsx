import { forwardRef, useEffect, useMemo, useState, type ReactNode } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { Pencil, Plus, X } from 'lucide-react';
import { useForm } from 'react-hook-form';

import { ApiError } from '@shared/Services/Http/ApiError';
import { Alert, AlertDescription } from '@shared/Components/Reui/alert';
import { Button } from '@shared/Components/Ui/Button';
import { ComboboxSelect } from '@shared/Components/Ui/ComboboxSelect';
import { Input } from '@shared/Components/Ui/Input';
import { Card, CardContent, CardHeader, CardTitle } from '@shared/Components/Ui/Card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@shared/Components/Ui/Table';
import { conflictMessage } from '@modules/MasterData/Application/Commands/CatalogConflictError';
import { useCatalogMutations } from '@modules/MasterData/Application/Commands/UseCatalogMutations';
import { useSkuRelations } from '@modules/MasterData/Application/Queries/CatalogQueries';
import { ReasonCodeSelect } from '@modules/ReasonCode/Presentation/Components/ReasonCodeSelect';
import { MASTER_DATA_STATUSES } from '@modules/MasterData/Domain/Constants/CatalogConstants';
import type {
  ItemCoverage,
  PackDefinition,
  SkuBarcode,
  Uom,
  UomConversion,
} from '@modules/MasterData/Domain/Types/CatalogEntities';
import type { Warehouse } from '@modules/MasterData/Domain/Types/MasterDataEntities';
import type {
  CreateItemCoverageInput,
  CreatePackDefinitionInput,
  CreateSkuBarcodeInput,
  CreateUomConversionInput,
} from '@modules/MasterData/Domain/Types/CatalogQuery';
import { StatusBadge } from '@modules/MasterData/Presentation/Components/StatusBadge';
import {
  itemCoverageFormSchema,
  packDefinitionFormSchema,
  skuBarcodeFormSchema,
  uomConversionFormSchema,
  type ItemCoverageFormValues,
  type PackDefinitionFormValues,
  type SkuBarcodeFormValues,
  type UomConversionFormValues,
} from '@modules/MasterData/Presentation/Forms/CatalogFormSchemas';
import {
  mergeSelectedOption,
  type SelectOption,
} from '@modules/MasterData/Presentation/Forms/SelectOptions';
import { displayMasterDataStatus } from '@modules/MasterData/Presentation/Constants/MasterDataDisplayText';

const masterDataStatusOptions = MASTER_DATA_STATUSES.map((status) => ({
  value: status,
  label: displayMasterDataStatus(status),
}));

interface SkuRelationsPanelProps {
  skuId: string;
  uoms: Uom[];
  warehouses: Warehouse[];
  canEdit: boolean;
}

interface RelationColumn<T> {
  header: string;
  render: (row: T) => ReactNode;
}

export function SkuRelationsPanel({ skuId, uoms, warehouses, canEdit }: SkuRelationsPanelProps) {
  const { barcodes, packs, conversions, coverages } = useSkuRelations(skuId);
  const mutations = useCatalogMutations();
  const [nonce, setNonce] = useState(0);
  const [editingPack, setEditingPack] = useState<PackDefinition | null>(null);
  const [editingBarcode, setEditingBarcode] = useState<SkuBarcode | null>(null);
  const [editingConversion, setEditingConversion] = useState<UomConversion | null>(null);
  const [editingCoverage, setEditingCoverage] = useState<ItemCoverage | null>(null);
  const [packError, setPackError] = useState<unknown>(null);
  const [barcodeError, setBarcodeError] = useState<unknown>(null);
  const [conversionError, setConversionError] = useState<unknown>(null);
  const [coverageError, setCoverageError] = useState<unknown>(null);
  const onChanged = () => setNonce((value) => value + 1);

  const uomOptions = useMemo(
    () => uoms.map((uom) => ({ value: uom.id, label: `${uom.uomCode} - ${uom.uomName}` })),
    [uoms],
  );
  const warehouseOptions = useMemo(
    () =>
      warehouses.map((warehouse) => ({
        value: warehouse.id,
        label: `${warehouse.warehouseCode} - ${warehouse.warehouseName}`,
      })),
    [warehouses],
  );

  const readonlyPack = !canEdit || packs.isLoading || Boolean(packs.error);
  const readonlyBarcode = !canEdit || barcodes.isLoading || Boolean(barcodes.error);
  const readonlyConversion = !canEdit || conversions.isLoading || Boolean(conversions.error);
  const readonlyCoverage = !canEdit || coverages.isLoading || Boolean(coverages.error);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Quan hệ SKU</CardTitle>
      </CardHeader>
      <CardContent className="grid gap-6 xl:grid-cols-2">
        <RelationSection
          title="Quy cách đóng gói"
          rows={packs.data?.items ?? []}
          rowKey={(pack) => pack.id}
          loading={packs.isLoading}
          error={packs.error}
          emptyLabel="Chưa có quy cách đóng gói"
          disabled={readonlyPack}
          readOnly={!canEdit}
          columns={[
            { header: 'Mã', render: (pack) => pack.packCode },
            { header: 'Tên', render: (pack) => pack.packName },
            { header: 'Đơn vị tính', render: (pack) => optionLabel(uomOptions, pack.uomId) },
            { header: 'Số lượng', render: (pack) => pack.quantityPerPack },
            { header: 'Trạng thái', render: (pack) => <StatusBadge status={pack.status} /> },
          ]}
          onEdit={(pack) => {
            setEditingPack(pack);
            setPackError(null);
          }}
          form={
            <PackForm
              key={`pack-${skuId}-${editingPack?.id ?? 'create'}-${nonce}`}
              skuId={skuId}
              initialValue={editingPack}
              uomOptions={mergeSelectedOption(uomOptions, editingPack?.uomId)}
              disabled={readonlyPack}
              pending={
                editingPack
                  ? mutations.updatePackDefinition.isPending
                  : mutations.createPackDefinition.isPending
              }
              conflict={conflictMessage(packError) ?? undefined}
              onCancel={editingPack ? () => setEditingPack(null) : undefined}
              onSubmit={(values) => {
                const input = toPackInput(values);
                if (editingPack) {
                  mutations.updatePackDefinition.mutate(
                    { id: editingPack.id, input },
                    {
                      onError: setPackError,
                      onSuccess: () => {
                        setEditingPack(null);
                        setPackError(null);
                        onChanged();
                      },
                    },
                  );
                  return;
                }
                mutations.createPackDefinition.mutate(input, {
                  onError: setPackError,
                  onSuccess: () => {
                    setPackError(null);
                    onChanged();
                  },
                });
              }}
            />
          }
        />

        <RelationSection
          title="Mã vạch"
          rows={barcodes.data?.items ?? []}
          rowKey={(barcode) => barcode.id}
          loading={barcodes.isLoading}
          error={barcodes.error}
          emptyLabel="Chưa có mã vạch"
          disabled={readonlyBarcode}
          readOnly={!canEdit}
          columns={[
            { header: 'Giá trị', render: (barcode) => barcode.barcodeValue },
            { header: 'Loại', render: (barcode) => barcode.barcodeType },
            { header: 'Đơn vị tính', render: (barcode) => optionLabel(uomOptions, barcode.uomId) },
            { header: 'Quy cách', render: (barcode) => barcode.packCode ?? '-' },
            {
              header: 'Hiệu lực',
              render: (barcode) =>
                `${dateOnly(barcode.effectiveFrom) || '-'} / ${
                  dateOnly(barcode.effectiveTo) || '-'
                }`,
            },
            { header: 'Trạng thái', render: (barcode) => <StatusBadge status={barcode.status} /> },
          ]}
          onEdit={(barcode) => {
            setEditingBarcode(barcode);
            setBarcodeError(null);
          }}
          form={
            <BarcodeForm
              key={`barcode-${skuId}-${editingBarcode?.id ?? 'create'}-${nonce}`}
              skuId={skuId}
              initialValue={editingBarcode}
              uomOptions={mergeSelectedOption(uomOptions, editingBarcode?.uomId)}
              disabled={readonlyBarcode}
              pending={
                editingBarcode
                  ? mutations.updateSkuBarcode.isPending
                  : mutations.createSkuBarcode.isPending
              }
              conflict={conflictMessage(barcodeError) ?? undefined}
              onCancel={editingBarcode ? () => setEditingBarcode(null) : undefined}
              onSubmit={(values) => {
                const input = toBarcodeInput(values);
                if (editingBarcode) {
                  mutations.updateSkuBarcode.mutate(
                    { id: editingBarcode.id, input },
                    {
                      onError: setBarcodeError,
                      onSuccess: () => {
                        setEditingBarcode(null);
                        setBarcodeError(null);
                        onChanged();
                      },
                    },
                  );
                  return;
                }
                mutations.createSkuBarcode.mutate(input, {
                  onError: setBarcodeError,
                  onSuccess: () => {
                    setBarcodeError(null);
                    onChanged();
                  },
                });
              }}
            />
          }
        />

        <RelationSection
          title="Quy đổi đơn vị tính"
          rows={conversions.data?.items ?? []}
          rowKey={(conversion) => conversion.id}
          loading={conversions.isLoading}
          error={conversions.error}
          emptyLabel="Chưa có quy đổi"
          disabled={readonlyConversion}
          readOnly={!canEdit}
          columns={[
            {
              header: 'Từ',
              render: (conversion) => optionLabel(uomOptions, conversion.fromUomId),
            },
            { header: 'Đến', render: (conversion) => optionLabel(uomOptions, conversion.toUomId) },
            { header: 'Hệ số', render: (conversion) => conversion.factor },
            { header: 'Ngày hiệu lực', render: (conversion) => dateOnly(conversion.effectiveFrom) },
            {
              header: 'Trạng thái',
              render: (conversion) => <StatusBadge status={conversion.status} />,
            },
          ]}
          onEdit={(conversion) => {
            setEditingConversion(conversion);
            setConversionError(null);
          }}
          form={
            <ConversionForm
              key={`conversion-${skuId}-${editingConversion?.id ?? 'create'}-${nonce}`}
              skuId={skuId}
              initialValue={editingConversion}
              uomOptions={mergeSelectedOption(
                mergeSelectedOption(uomOptions, editingConversion?.fromUomId),
                editingConversion?.toUomId,
              )}
              disabled={readonlyConversion}
              pending={
                editingConversion
                  ? mutations.updateUomConversion.isPending
                  : mutations.createUomConversion.isPending
              }
              conflict={conflictMessage(conversionError) ?? undefined}
              onCancel={editingConversion ? () => setEditingConversion(null) : undefined}
              onSubmit={(values) => {
                const input = toConversionInput(values);
                if (editingConversion) {
                  mutations.updateUomConversion.mutate(
                    { id: editingConversion.id, input },
                    {
                      onError: setConversionError,
                      onSuccess: () => {
                        setEditingConversion(null);
                        setConversionError(null);
                        onChanged();
                      },
                    },
                  );
                  return;
                }
                mutations.createUomConversion.mutate(input, {
                  onError: setConversionError,
                  onSuccess: () => {
                    setConversionError(null);
                    onChanged();
                  },
                });
              }}
            />
          }
        />

        <RelationSection
          title="Phạm vi hàng hóa"
          rows={coverages.data?.items ?? []}
          rowKey={(coverage) => coverage.id}
          loading={coverages.isLoading}
          error={coverages.error}
          emptyLabel="Chưa có phạm vi hàng hóa"
          disabled={readonlyCoverage}
          readOnly={!canEdit}
          columns={[
            {
              header: 'Kho',
              render: (coverage) => optionLabel(warehouseOptions, coverage.warehouseId),
            },
            { header: 'Tối thiểu/Tối đa', render: (coverage) => `${coverage.minQty}/${coverage.maxQty}` },
            { header: 'Bội số', render: (coverage) => coverage.multipleQty },
            {
              header: 'Dừng xử lý',
              render: (coverage) =>
                coverage.stopReceiving || coverage.stopShipping
                  ? [coverage.stopReceiving ? 'Nhận hàng' : null, coverage.stopShipping ? 'Xuất hàng' : null]
                      .filter(Boolean)
                      .join(', ')
                  : '-',
            },
            { header: 'Trạng thái', render: (coverage) => <StatusBadge status={coverage.status} /> },
          ]}
          onEdit={(coverage) => {
            setEditingCoverage(coverage);
            setCoverageError(null);
          }}
          form={
            <CoverageForm
              key={`coverage-${skuId}-${editingCoverage?.id ?? 'create'}-${nonce}`}
              skuId={skuId}
              initialValue={editingCoverage}
              warehouseOptions={mergeSelectedOption(warehouseOptions, editingCoverage?.warehouseId)}
              disabled={readonlyCoverage}
              pending={
                editingCoverage
                  ? mutations.updateItemCoverage.isPending
                  : mutations.createItemCoverage.isPending
              }
              conflict={conflictMessage(coverageError) ?? undefined}
              onCancel={editingCoverage ? () => setEditingCoverage(null) : undefined}
              onSubmit={(values) => {
                const input = toCoverageInput(values);
                if (editingCoverage) {
                  mutations.updateItemCoverage.mutate(
                    { id: editingCoverage.id, input },
                    {
                      onError: setCoverageError,
                      onSuccess: () => {
                        setEditingCoverage(null);
                        setCoverageError(null);
                        onChanged();
                      },
                    },
                  );
                  return;
                }
                mutations.createItemCoverage.mutate(input, {
                  onError: setCoverageError,
                  onSuccess: () => {
                    setCoverageError(null);
                    onChanged();
                  },
                });
              }}
            />
          }
        />
      </CardContent>
    </Card>
  );
}

function RelationSection<T extends { id: string }>({
  title,
  rows,
  rowKey,
  loading,
  error,
  emptyLabel,
  disabled,
  readOnly,
  columns,
  onEdit,
  form,
}: {
  title: string;
  rows: T[];
  rowKey: (row: T) => string;
  loading: boolean;
  error: unknown;
  emptyLabel: string;
  disabled: boolean;
  readOnly: boolean;
  columns: RelationColumn<T>[];
  onEdit: (row: T) => void;
  form: ReactNode;
}) {
  const state = relationState({ loading, error, empty: rows.length === 0, emptyLabel });

  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-sm font-medium">{title}</h3>
        {disabled && <span className="text-muted-foreground text-xs">Chỉ đọc</span>}
      </div>
      {readOnly && (
        <Alert role="status" variant="info">
          <AlertDescription>Quan hệ này đang ở chế độ chỉ đọc.</AlertDescription>
        </Alert>
      )}
      {state ? (
        <Alert role={state.role} variant={state.variant}>
          <AlertDescription>{state.message}</AlertDescription>
        </Alert>
      ) : (
        <>
          <div className="border-border bg-card hidden rounded-lg border md:block">
            <Table>
              <TableHeader>
                <TableRow>
                  {columns.map((column) => (
                    <TableHead key={column.header}>{column.header}</TableHead>
                  ))}
                  <TableHead className="w-12">Chỉnh sửa</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((row) => (
                  <TableRow key={rowKey(row)}>
                    {columns.map((column) => (
                      <TableCell key={column.header}>{column.render(row)}</TableCell>
                    ))}
                    <TableCell>
                      <Button
                        type="button"
                        size="icon"
                        variant="ghost"
                        title={`Chỉnh sửa ${title}`}
                        aria-label={`Chỉnh sửa ${title}`}
                        disabled={disabled}
                        onClick={() => onEdit(row)}
                      >
                        <Pencil className="size-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          <div className="grid gap-2 md:hidden" data-sku-relation-mobile-list>
            {rows.map((row) => (
              <article
                key={rowKey(row)}
                className="border-border bg-card grid gap-3 rounded-lg border p-3"
                data-sku-relation-mobile-row
              >
                {columns.map((column) => (
                  <div key={column.header} className="grid min-w-0 gap-1">
                    <span className="text-muted-foreground text-xs font-medium">{column.header}</span>
                    <div className="min-w-0 break-words text-sm">{column.render(row)}</div>
                  </div>
                ))}
                <div className="flex justify-end">
                  <Button
                    type="button"
                    size="icon"
                    variant="ghost"
                    title={`Chỉnh sửa ${title}`}
                    aria-label={`Chỉnh sửa ${title}`}
                    disabled={disabled}
                    onClick={() => onEdit(row)}
                  >
                    <Pencil className="size-4" />
                  </Button>
                </div>
              </article>
            ))}
          </div>
        </>
      )}
      {form}
    </section>
  );
}

function PackForm({
  skuId,
  initialValue,
  uomOptions,
  disabled,
  pending,
  conflict,
  onCancel,
  onSubmit,
}: {
  skuId: string;
  initialValue: PackDefinition | null;
  uomOptions: SelectOption[];
  disabled: boolean;
  pending: boolean;
  conflict?: string;
  onCancel?: () => void;
  onSubmit: (values: PackDefinitionFormValues) => void;
}) {
  const defaults = useMemo(
    () => ({
      skuId,
      packCode: initialValue?.packCode ?? '',
      packName: initialValue?.packName ?? '',
      uomId: initialValue?.uomId ?? '',
      quantityPerPack: initialValue?.quantityPerPack ?? 1,
      status: initialValue?.status ?? 'Active',
      isDefault: initialValue?.isDefault ?? false,
      reasonCode: '',
    }),
    [initialValue, skuId],
  );
  const form = useForm<PackDefinitionFormValues>({
    resolver: zodResolver(packDefinitionFormSchema),
    defaultValues: defaults,
  });
  useEffect(() => form.reset(defaults), [defaults, form]);
  const reasonCode = form.watch('reasonCode') ?? '';
  const uomId = form.watch('uomId');
  const { ref: uomIdRef } = form.register('uomId');
  const status = form.watch('status');
  const { ref: statusRef } = form.register('status');

  return (
    <form className="grid gap-2" onSubmit={form.handleSubmit(onSubmit)}>
      <div className="grid gap-2 sm:grid-cols-2">
        <Field label="Mã quy cách" error={form.formState.errors.packCode?.message}>
          <Input disabled={disabled} {...form.register('packCode')} />
        </Field>
        <Field label="Tên quy cách" error={form.formState.errors.packName?.message}>
          <Input disabled={disabled} {...form.register('packName')} />
        </Field>
        <SelectField
          ref={uomIdRef}
          id="pack-uom-id"
          label="Đơn vị tính"
          value={uomId}
          disabled={disabled}
          options={uomOptions}
          error={form.formState.errors.uomId?.message}
          onChange={(value) => form.setValue('uomId', value, { shouldDirty: true, shouldValidate: true })}
        />
        <Field label="Số lượng mỗi quy cách" error={form.formState.errors.quantityPerPack?.message}>
          <Input type="number" step="0.000001" disabled={disabled} {...form.register('quantityPerPack')} />
        </Field>
        <SelectField
          ref={statusRef}
          id="pack-status"
          label="Trạng thái"
          value={status}
          disabled={disabled}
          options={masterDataStatusOptions}
          error={form.formState.errors.status?.message}
          onChange={(value) =>
            form.setValue('status', value as PackDefinitionFormValues['status'], {
              shouldDirty: true,
              shouldValidate: true,
            })
          }
        />
        <div>
          <ReasonCodeSelect
            id="pack-definition-reason-code"
            name="reasonCode"
            label="Mã lý do"
            value={reasonCode}
            action={initialValue ? 'Update' : 'Create'}
            objectType="SKU"
            optional
            disabled={disabled}
            onChange={(value) => form.setValue('reasonCode', value, { shouldDirty: true, shouldValidate: true })}
          />
          {form.formState.errors.reasonCode?.message ? (
            <p className="mt-1 text-xs text-destructive">{form.formState.errors.reasonCode.message}</p>
          ) : null}
        </div>
      </div>
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" disabled={disabled} {...form.register('isDefault')} />Quy cách mặc định</label>
      <FormActions
        editing={Boolean(initialValue)}
        disabled={disabled}
        pending={pending}
        conflict={conflict}
        createLabel="Thêm quy cách"
        updateLabel="Cập nhật quy cách"
        onCancel={onCancel}
      />
    </form>
  );
}

function BarcodeForm({
  skuId,
  initialValue,
  uomOptions,
  disabled,
  pending,
  conflict,
  onCancel,
  onSubmit,
}: {
  skuId: string;
  initialValue: SkuBarcode | null;
  uomOptions: SelectOption[];
  disabled: boolean;
  pending: boolean;
  conflict?: string;
  onCancel?: () => void;
  onSubmit: (values: SkuBarcodeFormValues) => void;
}) {
  const defaults = useMemo(
    () => ({
      skuId,
      uomId: initialValue?.uomId ?? '',
      barcodeValue: initialValue?.barcodeValue ?? '',
      barcodeType: initialValue?.barcodeType ?? 'EAN13',
      status: initialValue?.status ?? 'Active',
      ownerId: initialValue?.ownerId ?? '',
      packCode: initialValue?.packCode ?? '',
      isPrimary: initialValue?.isPrimary ?? false,
      effectiveFrom: dateOnly(initialValue?.effectiveFrom ?? ''),
      effectiveTo: dateOnly(initialValue?.effectiveTo ?? ''),
      reasonCode: '',
    }),
    [initialValue, skuId],
  );
  const form = useForm<SkuBarcodeFormValues>({
    resolver: zodResolver(skuBarcodeFormSchema),
    defaultValues: defaults,
  });
  useEffect(() => form.reset(defaults), [defaults, form]);
  const reasonCode = form.watch('reasonCode') ?? '';
  const uomId = form.watch('uomId');
  const { ref: uomIdRef } = form.register('uomId');
  const status = form.watch('status');
  const { ref: statusRef } = form.register('status');

  return (
    <form className="grid gap-2" onSubmit={form.handleSubmit(onSubmit)}>
      <div className="grid gap-2 sm:grid-cols-2">
        <Field label="Giá trị mã vạch" error={form.formState.errors.barcodeValue?.message}>
          <Input disabled={disabled} {...form.register('barcodeValue')} />
        </Field>
        <Field label="Loại mã vạch" error={form.formState.errors.barcodeType?.message}>
          <Input disabled={disabled} {...form.register('barcodeType')} />
        </Field>
        <SelectField
          ref={uomIdRef}
          id="barcode-uom-id"
          label="Đơn vị tính"
          value={uomId}
          disabled={disabled}
          options={uomOptions}
          error={form.formState.errors.uomId?.message}
          onChange={(value) => form.setValue('uomId', value, { shouldDirty: true, shouldValidate: true })}
        />
        <Field label="Mã quy cách" error={form.formState.errors.packCode?.message}>
          <Input disabled={disabled} {...form.register('packCode')} />
        </Field>
        <Field label="Hiệu lực từ" error={form.formState.errors.effectiveFrom?.message}>
          <Input type="date" disabled={disabled} {...form.register('effectiveFrom')} />
        </Field>
        <Field label="Hiệu lực đến" error={form.formState.errors.effectiveTo?.message}>
          <Input type="date" disabled={disabled} {...form.register('effectiveTo')} />
        </Field>
        <SelectField
          ref={statusRef}
          id="barcode-status"
          label="Trạng thái"
          value={status}
          disabled={disabled}
          options={masterDataStatusOptions}
          error={form.formState.errors.status?.message}
          onChange={(value) =>
            form.setValue('status', value as SkuBarcodeFormValues['status'], {
              shouldDirty: true,
              shouldValidate: true,
            })
          }
        />
        <div>
          <ReasonCodeSelect
            id="sku-barcode-reason-code"
            name="reasonCode"
            label="Mã lý do"
            value={reasonCode}
            action={initialValue ? 'Update' : 'Create'}
            objectType="SKU"
            optional
            disabled={disabled}
            onChange={(value) => form.setValue('reasonCode', value, { shouldDirty: true, shouldValidate: true })}
          />
          {form.formState.errors.reasonCode?.message ? (
            <p className="mt-1 text-xs text-destructive">{form.formState.errors.reasonCode.message}</p>
          ) : null}
        </div>
      </div>
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" disabled={disabled} {...form.register('isPrimary')} />Mã vạch chính</label>
      <FormActions
        editing={Boolean(initialValue)}
        disabled={disabled}
        pending={pending}
        conflict={conflict}
        createLabel="Thêm mã vạch"
        updateLabel="Cập nhật mã vạch"
        onCancel={onCancel}
      />
    </form>
  );
}

function ConversionForm({
  skuId,
  initialValue,
  uomOptions,
  disabled,
  pending,
  conflict,
  onCancel,
  onSubmit,
}: {
  skuId: string;
  initialValue: UomConversion | null;
  uomOptions: SelectOption[];
  disabled: boolean;
  pending: boolean;
  conflict?: string;
  onCancel?: () => void;
  onSubmit: (values: UomConversionFormValues) => void;
}) {
  const defaults = useMemo(
    () => ({
      skuId,
      fromUomId: initialValue?.fromUomId ?? '',
      toUomId: initialValue?.toUomId ?? '',
      factor: initialValue?.factor ?? 1,
      effectiveFrom: dateOnly(initialValue?.effectiveFrom ?? ''),
      effectiveTo: dateOnly(initialValue?.effectiveTo ?? ''),
      status: initialValue?.status ?? 'Active',
      reasonCode: '',
    }),
    [initialValue, skuId],
  );
  const form = useForm<UomConversionFormValues>({
    resolver: zodResolver(uomConversionFormSchema),
    defaultValues: defaults,
  });
  useEffect(() => form.reset(defaults), [defaults, form]);
  const reasonCode = form.watch('reasonCode') ?? '';
  const fromUomId = form.watch('fromUomId');
  const { ref: fromUomIdRef } = form.register('fromUomId');
  const toUomId = form.watch('toUomId');
  const { ref: toUomIdRef } = form.register('toUomId');
  const status = form.watch('status');
  const { ref: statusRef } = form.register('status');

  return (
    <form className="grid gap-2" onSubmit={form.handleSubmit(onSubmit)}>
      <div className="grid gap-2 sm:grid-cols-2">
        <SelectField
          ref={fromUomIdRef}
          id="conversion-from-uom-id"
          label="Từ đơn vị tính"
          value={fromUomId}
          disabled={disabled}
          options={uomOptions}
          error={form.formState.errors.fromUomId?.message}
          onChange={(value) => form.setValue('fromUomId', value, { shouldDirty: true, shouldValidate: true })}
        />
        <SelectField
          ref={toUomIdRef}
          id="conversion-to-uom-id"
          label="Đến đơn vị tính"
          value={toUomId}
          disabled={disabled}
          options={uomOptions}
          error={form.formState.errors.toUomId?.message}
          onChange={(value) => form.setValue('toUomId', value, { shouldDirty: true, shouldValidate: true })}
        />
        <Field label="Hệ số" error={form.formState.errors.factor?.message}>
          <Input type="number" step="0.000001" disabled={disabled} {...form.register('factor')} />
        </Field>
        <Field label="Hiệu lực từ" error={form.formState.errors.effectiveFrom?.message}>
          <Input type="date" disabled={disabled} {...form.register('effectiveFrom')} />
        </Field>
        <Field label="Hiệu lực đến" error={form.formState.errors.effectiveTo?.message}>
          <Input type="date" disabled={disabled} {...form.register('effectiveTo')} />
        </Field>
        <SelectField
          ref={statusRef}
          id="conversion-status"
          label="Trạng thái"
          value={status}
          disabled={disabled}
          options={masterDataStatusOptions}
          error={form.formState.errors.status?.message}
          onChange={(value) =>
            form.setValue('status', value as UomConversionFormValues['status'], {
              shouldDirty: true,
              shouldValidate: true,
            })
          }
        />
        <div>
          <ReasonCodeSelect
            id="uom-conversion-reason-code"
            name="reasonCode"
            label="Mã lý do"
            value={reasonCode}
            action={initialValue ? 'Update' : 'Create'}
            objectType="UOM"
            optional
            disabled={disabled}
            onChange={(value) => form.setValue('reasonCode', value, { shouldDirty: true, shouldValidate: true })}
          />
          {form.formState.errors.reasonCode?.message ? (
            <p className="mt-1 text-xs text-destructive">{form.formState.errors.reasonCode.message}</p>
          ) : null}
        </div>
      </div>
      <FormActions
        editing={Boolean(initialValue)}
        disabled={disabled}
        pending={pending}
        conflict={conflict}
        createLabel="Thêm quy đổi"
        updateLabel="Cập nhật quy đổi"
        onCancel={onCancel}
      />
    </form>
  );
}

function CoverageForm({
  skuId,
  initialValue,
  warehouseOptions,
  disabled,
  pending,
  conflict,
  onCancel,
  onSubmit,
}: {
  skuId: string;
  initialValue: ItemCoverage | null;
  warehouseOptions: SelectOption[];
  disabled: boolean;
  pending: boolean;
  conflict?: string;
  onCancel?: () => void;
  onSubmit: (values: ItemCoverageFormValues) => void;
}) {
  const defaults = useMemo(
    () => ({
      skuId,
      warehouseId: initialValue?.warehouseId ?? '',
      status: initialValue?.status ?? 'Active',
      ownerId: initialValue?.ownerId ?? '',
      minQty: initialValue?.minQty ?? 0,
      maxQty: initialValue?.maxQty ?? 0,
      standardQty: initialValue?.standardQty ?? 0,
      multipleQty: initialValue?.multipleQty ?? 1,
      leadTimeDays: initialValue?.leadTimeDays ?? 0,
      stopReceiving: initialValue?.stopReceiving ?? false,
      stopShipping: initialValue?.stopShipping ?? false,
    }),
    [initialValue, skuId],
  );
  const form = useForm<ItemCoverageFormValues>({
    resolver: zodResolver(itemCoverageFormSchema),
    defaultValues: defaults,
  });
  useEffect(() => form.reset(defaults), [defaults, form]);
  const warehouseId = form.watch('warehouseId');
  const { ref: warehouseIdRef } = form.register('warehouseId');
  const status = form.watch('status');
  const { ref: statusRef } = form.register('status');

  return (
    <form className="grid gap-2" onSubmit={form.handleSubmit(onSubmit)}>
      <div className="grid gap-2 sm:grid-cols-2">
        <SelectField
          ref={warehouseIdRef}
          id="coverage-warehouse-id"
          label="Kho"
          value={warehouseId}
          disabled={disabled}
          options={warehouseOptions}
          error={form.formState.errors.warehouseId?.message}
          onChange={(value) => form.setValue('warehouseId', value, { shouldDirty: true, shouldValidate: true })}
        />
        <SelectField
          ref={statusRef}
          id="coverage-status"
          label="Trạng thái"
          value={status}
          disabled={disabled}
          options={masterDataStatusOptions}
          error={form.formState.errors.status?.message}
          onChange={(value) =>
            form.setValue('status', value as ItemCoverageFormValues['status'], {
              shouldDirty: true,
              shouldValidate: true,
            })
          }
        />
        <Field label="Số lượng tối thiểu" error={form.formState.errors.minQty?.message}>
          <Input type="number" disabled={disabled} {...form.register('minQty')} />
        </Field>
        <Field label="Số lượng tối đa" error={form.formState.errors.maxQty?.message}>
          <Input type="number" disabled={disabled} {...form.register('maxQty')} />
        </Field>
        <Field label="Số lượng chuẩn" error={form.formState.errors.standardQty?.message}>
          <Input type="number" disabled={disabled} {...form.register('standardQty')} />
        </Field>
        <Field label="Bội số lượng" error={form.formState.errors.multipleQty?.message}>
          <Input type="number" disabled={disabled} {...form.register('multipleQty')} />
        </Field>
        <Field label="Thời gian bổ sung (ngày)" error={form.formState.errors.leadTimeDays?.message}>
          <Input type="number" disabled={disabled} {...form.register('leadTimeDays')} />
        </Field>
      </div>
      <div className="flex flex-wrap gap-4">
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" disabled={disabled} {...form.register('stopReceiving')} />Dừng nhận hàng</label>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" disabled={disabled} {...form.register('stopShipping')} />Dừng xuất hàng</label>
      </div>
      <FormActions
        editing={Boolean(initialValue)}
        disabled={disabled}
        pending={pending}
        conflict={conflict}
        createLabel="Thêm phạm vi"
        updateLabel="Cập nhật phạm vi"
        onCancel={onCancel}
      />
    </form>
  );
}

function Field({
  label,
  error,
  children,
}: {
  label: string;
  error?: string;
  children: ReactNode;
}) {
  return (
    <label className="grid gap-1 text-sm">
      {label}
      {children}
      {error && <span className="text-destructive text-xs">{error}</span>}
    </label>
  );
}

const SelectField = forwardRef<
  HTMLButtonElement,
  {
    id: string;
    label: string;
    value: string;
    options: SelectOption[];
    error?: string;
    disabled?: boolean;
    onChange: (value: string) => void;
  }
>(function SelectField({ id, label, value, options, error, disabled, onChange }, ref) {
  return (
    <div className="grid gap-1">
      <ComboboxSelect
        ref={ref}
        id={id}
        name={id}
        label={label}
        value={value}
        placeholder={`Chọn ${label}`}
        options={options}
        disabled={disabled}
        onChange={onChange}
      />
      {error && <span className="text-destructive text-xs">{error}</span>}
    </div>
  );
});

function FormActions({
  editing,
  disabled,
  pending,
  conflict,
  createLabel,
  updateLabel,
  onCancel,
}: {
  editing: boolean;
  disabled: boolean;
  pending: boolean;
  conflict?: string;
  createLabel: string;
  updateLabel: string;
  onCancel?: () => void;
}) {
  return (
    <div className="grid gap-2">
      {conflict && (
        <Alert role="alert" variant="destructive">
          <AlertDescription>{conflict}</AlertDescription>
        </Alert>
      )}
      <div className="flex flex-wrap gap-2">
        <Button type="submit" size="sm" disabled={disabled || pending}>
          {editing ? <Pencil className="size-4" /> : <Plus className="size-4" />}
          {editing ? updateLabel : createLabel}
        </Button>
        {onCancel && (
          <Button type="button" size="sm" variant="outline" onClick={onCancel} disabled={pending}>
            <X className="size-4" />Hủy</Button>
        )}
      </div>
    </div>
  );
}

type RelationAlertVariant = 'info' | 'warning' | 'destructive';
type RelationAlertRole = 'status' | 'alert';

function relationState({
  loading,
  error,
  empty,
  emptyLabel,
}: {
  loading: boolean;
  error: unknown;
  empty: boolean;
  emptyLabel: string;
}): { message: string; variant: RelationAlertVariant; role: RelationAlertRole } | null {
  if (loading) return { message: 'Đang tải...', variant: 'info', role: 'status' };
  if (isForbidden(error)) {
    return {
      message: 'Không có quyền. Quan hệ này đang ở chế độ chỉ đọc.',
      variant: 'warning',
      role: 'status',
    };
  }
  if (error instanceof ApiError) return { message: error.message, variant: 'destructive', role: 'alert' };
  if (error) return { message: 'Không thể tải dữ liệu quan hệ.', variant: 'destructive', role: 'alert' };
  if (empty) return { message: emptyLabel, variant: 'info', role: 'status' };
  return null;
}

function isForbidden(error: unknown) {
  return error instanceof ApiError && error.isForbidden;
}

function optionLabel(options: SelectOption[], value: string | null) {
  if (!value) return '-';
  return options.find((option) => option.value === value)?.label ?? value;
}

function dateOnly(value: string | null) {
  return value ? value.slice(0, 10) : '';
}

function emptyToNull(value: string | null | undefined) {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

function toPackInput(values: PackDefinitionFormValues): CreatePackDefinitionInput {
  return {
    skuId: values.skuId,
    packCode: values.packCode,
    packName: values.packName,
    uomId: values.uomId,
    quantityPerPack: values.quantityPerPack,
    status: values.status,
    isDefault: values.isDefault,
    reasonCode: emptyToNull(values.reasonCode),
  };
}

function toBarcodeInput(values: SkuBarcodeFormValues): CreateSkuBarcodeInput {
  return {
    skuId: values.skuId,
    uomId: values.uomId,
    barcodeValue: values.barcodeValue,
    barcodeType: values.barcodeType,
    status: values.status,
    ownerId: emptyToNull(values.ownerId),
    packCode: emptyToNull(values.packCode),
    isPrimary: values.isPrimary,
    effectiveFrom: emptyToNull(values.effectiveFrom),
    effectiveTo: emptyToNull(values.effectiveTo),
    reasonCode: emptyToNull(values.reasonCode),
  };
}

function toConversionInput(values: UomConversionFormValues): CreateUomConversionInput {
  return {
    skuId: values.skuId,
    fromUomId: values.fromUomId,
    toUomId: values.toUomId,
    factor: values.factor,
    effectiveFrom: values.effectiveFrom,
    effectiveTo: emptyToNull(values.effectiveTo),
    status: values.status,
    reasonCode: emptyToNull(values.reasonCode),
  };
}

function toCoverageInput(values: ItemCoverageFormValues): CreateItemCoverageInput {
  return {
    skuId: values.skuId,
    warehouseId: values.warehouseId,
    status: values.status,
    ownerId: emptyToNull(values.ownerId),
    minQty: values.minQty,
    maxQty: values.maxQty,
    standardQty: values.standardQty,
    multipleQty: values.multipleQty,
    leadTimeDays: values.leadTimeDays,
    stopReceiving: values.stopReceiving,
    stopShipping: values.stopShipping,
  };
}
