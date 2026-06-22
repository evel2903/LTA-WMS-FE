import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { Pencil, Plus, X } from 'lucide-react';
import { useForm } from 'react-hook-form';

import { ApiError } from '@shared/Services/Http/ApiError';
import { Button } from '@shared/Components/Ui/Button';
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
import { MasterDataStatusBadge } from '@modules/MasterData/Presentation/Components/MasterDataStatusBadge';
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

const selectClass = 'h-9 rounded-md border bg-transparent px-3 text-sm';

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
        <CardTitle className="text-base">SKU relations</CardTitle>
      </CardHeader>
      <CardContent className="grid gap-6 xl:grid-cols-2">
        <RelationSection
          title="Pack"
          rows={packs.data?.items ?? []}
          rowKey={(pack) => pack.id}
          loading={packs.isLoading}
          error={packs.error}
          emptyLabel="No packs"
          disabled={readonlyPack}
          columns={[
            { header: 'Code', render: (pack) => pack.packCode },
            { header: 'Name', render: (pack) => pack.packName },
            { header: 'UOM', render: (pack) => optionLabel(uomOptions, pack.uomId) },
            { header: 'Qty', render: (pack) => pack.quantityPerPack },
            { header: 'Status', render: (pack) => <MasterDataStatusBadge status={pack.status} /> },
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
          title="Barcodes"
          rows={barcodes.data?.items ?? []}
          rowKey={(barcode) => barcode.id}
          loading={barcodes.isLoading}
          error={barcodes.error}
          emptyLabel="No barcodes"
          disabled={readonlyBarcode}
          columns={[
            { header: 'Value', render: (barcode) => barcode.barcodeValue },
            { header: 'Type', render: (barcode) => barcode.barcodeType },
            { header: 'UOM', render: (barcode) => optionLabel(uomOptions, barcode.uomId) },
            { header: 'Pack', render: (barcode) => barcode.packCode ?? '-' },
            {
              header: 'Effective',
              render: (barcode) =>
                `${dateOnly(barcode.effectiveFrom) || '-'} / ${
                  dateOnly(barcode.effectiveTo) || '-'
                }`,
            },
            { header: 'Status', render: (barcode) => <MasterDataStatusBadge status={barcode.status} /> },
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
          title="UOM conversions"
          rows={conversions.data?.items ?? []}
          rowKey={(conversion) => conversion.id}
          loading={conversions.isLoading}
          error={conversions.error}
          emptyLabel="No conversions"
          disabled={readonlyConversion}
          columns={[
            {
              header: 'From',
              render: (conversion) => optionLabel(uomOptions, conversion.fromUomId),
            },
            { header: 'To', render: (conversion) => optionLabel(uomOptions, conversion.toUomId) },
            { header: 'Factor', render: (conversion) => conversion.factor },
            { header: 'From date', render: (conversion) => dateOnly(conversion.effectiveFrom) },
            {
              header: 'Status',
              render: (conversion) => <MasterDataStatusBadge status={conversion.status} />,
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
          title="Item coverage"
          rows={coverages.data?.items ?? []}
          rowKey={(coverage) => coverage.id}
          loading={coverages.isLoading}
          error={coverages.error}
          emptyLabel="No coverage"
          disabled={readonlyCoverage}
          columns={[
            {
              header: 'Warehouse',
              render: (coverage) => optionLabel(warehouseOptions, coverage.warehouseId),
            },
            { header: 'Min/Max', render: (coverage) => `${coverage.minQty}/${coverage.maxQty}` },
            { header: 'Multiple', render: (coverage) => coverage.multipleQty },
            {
              header: 'Stops',
              render: (coverage) =>
                coverage.stopReceiving || coverage.stopShipping
                  ? [coverage.stopReceiving ? 'Receive' : null, coverage.stopShipping ? 'Ship' : null]
                      .filter(Boolean)
                      .join(', ')
                  : '-',
            },
            { header: 'Status', render: (coverage) => <MasterDataStatusBadge status={coverage.status} /> },
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
  columns: RelationColumn<T>[];
  onEdit: (row: T) => void;
  form: ReactNode;
}) {
  const message = relationMessage({ loading, error, empty: rows.length === 0, emptyLabel });

  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-sm font-medium">{title}</h3>
        {disabled && <span className="text-muted-foreground text-xs">Read-only</span>}
      </div>
      <Table>
        <TableHeader>
          <TableRow>
            {columns.map((column) => (
              <TableHead key={column.header}>{column.header}</TableHead>
            ))}
            <TableHead className="w-12">Edit</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {message ? (
            <TableRow>
              <TableCell colSpan={columns.length + 1} className="text-muted-foreground text-xs">
                {message}
              </TableCell>
            </TableRow>
          ) : (
            rows.map((row) => (
              <TableRow key={rowKey(row)}>
                {columns.map((column) => (
                  <TableCell key={column.header}>{column.render(row)}</TableCell>
                ))}
                <TableCell>
                  <Button
                    type="button"
                    size="icon"
                    variant="ghost"
                    title={`Edit ${title}`}
                    disabled={disabled}
                    onClick={() => onEdit(row)}
                  >
                    <Pencil className="size-4" />
                  </Button>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
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

  return (
    <form className="grid gap-2" onSubmit={form.handleSubmit(onSubmit)}>
      <div className="grid gap-2 sm:grid-cols-2">
        <Field label="Pack code" error={form.formState.errors.packCode?.message}>
          <Input disabled={disabled} {...form.register('packCode')} />
        </Field>
        <Field label="Pack name" error={form.formState.errors.packName?.message}>
          <Input disabled={disabled} {...form.register('packName')} />
        </Field>
        <SelectField
          label="UOM"
          disabled={disabled}
          options={uomOptions}
          error={form.formState.errors.uomId?.message}
          {...form.register('uomId')}
        />
        <Field label="Quantity per pack" error={form.formState.errors.quantityPerPack?.message}>
          <Input type="number" step="0.000001" disabled={disabled} {...form.register('quantityPerPack')} />
        </Field>
        <SelectField
          label="Status"
          disabled={disabled}
          options={MASTER_DATA_STATUSES.map((status) => ({ value: status, label: status }))}
          error={form.formState.errors.status?.message}
          {...form.register('status')}
        />
        <Field label="Reason code" error={form.formState.errors.reasonCode?.message}>
          <Input disabled={disabled} {...form.register('reasonCode')} />
        </Field>
      </div>
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" disabled={disabled} {...form.register('isDefault')} />
        Default pack
      </label>
      <FormActions
        editing={Boolean(initialValue)}
        disabled={disabled}
        pending={pending}
        conflict={conflict}
        createLabel="Add pack"
        updateLabel="Update pack"
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

  return (
    <form className="grid gap-2" onSubmit={form.handleSubmit(onSubmit)}>
      <div className="grid gap-2 sm:grid-cols-2">
        <Field label="Barcode value" error={form.formState.errors.barcodeValue?.message}>
          <Input disabled={disabled} {...form.register('barcodeValue')} />
        </Field>
        <Field label="Barcode type" error={form.formState.errors.barcodeType?.message}>
          <Input disabled={disabled} {...form.register('barcodeType')} />
        </Field>
        <SelectField
          label="UOM"
          disabled={disabled}
          options={uomOptions}
          error={form.formState.errors.uomId?.message}
          {...form.register('uomId')}
        />
        <Field label="Pack code" error={form.formState.errors.packCode?.message}>
          <Input disabled={disabled} {...form.register('packCode')} />
        </Field>
        <Field label="Effective from" error={form.formState.errors.effectiveFrom?.message}>
          <Input type="date" disabled={disabled} {...form.register('effectiveFrom')} />
        </Field>
        <Field label="Effective to" error={form.formState.errors.effectiveTo?.message}>
          <Input type="date" disabled={disabled} {...form.register('effectiveTo')} />
        </Field>
        <SelectField
          label="Status"
          disabled={disabled}
          options={MASTER_DATA_STATUSES.map((status) => ({ value: status, label: status }))}
          error={form.formState.errors.status?.message}
          {...form.register('status')}
        />
        <Field label="Reason code" error={form.formState.errors.reasonCode?.message}>
          <Input disabled={disabled} {...form.register('reasonCode')} />
        </Field>
      </div>
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" disabled={disabled} {...form.register('isPrimary')} />
        Primary barcode
      </label>
      <FormActions
        editing={Boolean(initialValue)}
        disabled={disabled}
        pending={pending}
        conflict={conflict}
        createLabel="Add barcode"
        updateLabel="Update barcode"
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

  return (
    <form className="grid gap-2" onSubmit={form.handleSubmit(onSubmit)}>
      <div className="grid gap-2 sm:grid-cols-2">
        <SelectField
          label="From UOM"
          disabled={disabled}
          options={uomOptions}
          error={form.formState.errors.fromUomId?.message}
          {...form.register('fromUomId')}
        />
        <SelectField
          label="To UOM"
          disabled={disabled}
          options={uomOptions}
          error={form.formState.errors.toUomId?.message}
          {...form.register('toUomId')}
        />
        <Field label="Factor" error={form.formState.errors.factor?.message}>
          <Input type="number" step="0.000001" disabled={disabled} {...form.register('factor')} />
        </Field>
        <Field label="Effective from" error={form.formState.errors.effectiveFrom?.message}>
          <Input type="date" disabled={disabled} {...form.register('effectiveFrom')} />
        </Field>
        <Field label="Effective to" error={form.formState.errors.effectiveTo?.message}>
          <Input type="date" disabled={disabled} {...form.register('effectiveTo')} />
        </Field>
        <SelectField
          label="Status"
          disabled={disabled}
          options={MASTER_DATA_STATUSES.map((status) => ({ value: status, label: status }))}
          error={form.formState.errors.status?.message}
          {...form.register('status')}
        />
        <Field label="Reason code" error={form.formState.errors.reasonCode?.message}>
          <Input disabled={disabled} {...form.register('reasonCode')} />
        </Field>
      </div>
      <FormActions
        editing={Boolean(initialValue)}
        disabled={disabled}
        pending={pending}
        conflict={conflict}
        createLabel="Add conversion"
        updateLabel="Update conversion"
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

  return (
    <form className="grid gap-2" onSubmit={form.handleSubmit(onSubmit)}>
      <div className="grid gap-2 sm:grid-cols-2">
        <SelectField
          label="Warehouse"
          disabled={disabled}
          options={warehouseOptions}
          error={form.formState.errors.warehouseId?.message}
          {...form.register('warehouseId')}
        />
        <SelectField
          label="Status"
          disabled={disabled}
          options={MASTER_DATA_STATUSES.map((status) => ({ value: status, label: status }))}
          error={form.formState.errors.status?.message}
          {...form.register('status')}
        />
        <Field label="Min qty" error={form.formState.errors.minQty?.message}>
          <Input type="number" disabled={disabled} {...form.register('minQty')} />
        </Field>
        <Field label="Max qty" error={form.formState.errors.maxQty?.message}>
          <Input type="number" disabled={disabled} {...form.register('maxQty')} />
        </Field>
        <Field label="Standard qty" error={form.formState.errors.standardQty?.message}>
          <Input type="number" disabled={disabled} {...form.register('standardQty')} />
        </Field>
        <Field label="Multiple qty" error={form.formState.errors.multipleQty?.message}>
          <Input type="number" disabled={disabled} {...form.register('multipleQty')} />
        </Field>
        <Field label="Lead time days" error={form.formState.errors.leadTimeDays?.message}>
          <Input type="number" disabled={disabled} {...form.register('leadTimeDays')} />
        </Field>
      </div>
      <div className="flex flex-wrap gap-4">
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" disabled={disabled} {...form.register('stopReceiving')} />
          Stop receiving
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" disabled={disabled} {...form.register('stopShipping')} />
          Stop shipping
        </label>
      </div>
      <FormActions
        editing={Boolean(initialValue)}
        disabled={disabled}
        pending={pending}
        conflict={conflict}
        createLabel="Add coverage"
        updateLabel="Update coverage"
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

function SelectField({
  label,
  options,
  error,
  ...props
}: {
  label: string;
  options: SelectOption[];
  error?: string;
} & React.ComponentProps<'select'>) {
  return (
    <Field label={label} error={error}>
      <select className={selectClass} {...props}>
        <option value="">Select {label}</option>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </Field>
  );
}

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
        <span className="text-destructive text-xs" role="alert">
          {conflict}
        </span>
      )}
      <div className="flex flex-wrap gap-2">
        <Button type="submit" size="sm" disabled={disabled || pending}>
          {editing ? <Pencil className="size-4" /> : <Plus className="size-4" />}
          {editing ? updateLabel : createLabel}
        </Button>
        {onCancel && (
          <Button type="button" size="sm" variant="outline" onClick={onCancel} disabled={pending}>
            <X className="size-4" />
            Cancel
          </Button>
        )}
      </div>
    </div>
  );
}

function relationMessage({
  loading,
  error,
  empty,
  emptyLabel,
}: {
  loading: boolean;
  error: unknown;
  empty: boolean;
  emptyLabel: string;
}) {
  if (loading) return 'Loading...';
  if (isForbidden(error)) return 'Permission denied. This relation is read-only.';
  if (error instanceof ApiError) return error.message;
  if (error) return 'Unable to load relation data.';
  if (empty) return emptyLabel;
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
