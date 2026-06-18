import { useState } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';

import { Button } from '@shared/Components/Ui/Button';
import { Input } from '@shared/Components/Ui/Input';
import { Card, CardContent, CardHeader, CardTitle } from '@shared/Components/Ui/Card';
import { conflictMessage } from '@modules/MasterData/Application/Commands/CatalogConflictError';
import { useCatalogMutations } from '@modules/MasterData/Application/Commands/UseCatalogMutations';
import { useSkuRelations } from '@modules/MasterData/Application/Queries/CatalogQueries';
import type { Uom } from '@modules/MasterData/Domain/Types/CatalogEntities';
import {
  itemCoverageFormSchema,
  skuBarcodeFormSchema,
  uomConversionFormSchema,
  type ItemCoverageFormValues,
  type SkuBarcodeFormValues,
  type UomConversionFormValues,
} from '@modules/MasterData/Presentation/Forms/CatalogFormSchemas';

interface SkuRelationsPanelProps {
  skuId: string;
  uoms: Uom[];
  canEdit: boolean;
}

export function SkuRelationsPanel({ skuId, uoms, canEdit }: SkuRelationsPanelProps) {
  const { barcodes, conversions, coverages } = useSkuRelations(skuId);
  const mutations = useCatalogMutations();
  const [nonce, setNonce] = useState(0);
  const [barcodeError, setBarcodeError] = useState<unknown>(null);
  const [conversionError, setConversionError] = useState<unknown>(null);
  const [coverageError, setCoverageError] = useState<unknown>(null);
  const onCreated = () => setNonce((value) => value + 1);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">SKU relations</CardTitle>
      </CardHeader>
      <CardContent className="grid gap-6 lg:grid-cols-3">
        <section className="space-y-3">
          <h3 className="text-sm font-medium">Barcodes</h3>
          <ul className="text-muted-foreground space-y-1 text-xs">
            {(barcodes.data?.items ?? []).map((barcode) => (
              <li key={barcode.id}>
                {barcode.barcodeValue} ({barcode.barcodeType})
              </li>
            ))}
            {(barcodes.data?.items.length ?? 0) === 0 && <li>No barcodes</li>}
          </ul>
          <BarcodeForm
            key={`barcode-${skuId}-${nonce}`}
            skuId={skuId}
            uoms={uoms}
            disabled={!canEdit}
            pending={mutations.createSkuBarcode.isPending}
            conflict={conflictMessage(barcodeError) ?? undefined}
            onSubmit={(values) =>
              mutations.createSkuBarcode.mutate(values, {
                onError: setBarcodeError,
                onSuccess: () => {
                  setBarcodeError(null);
                  onCreated();
                },
              })
            }
          />
        </section>

        <section className="space-y-3">
          <h3 className="text-sm font-medium">UOM conversions</h3>
          <ul className="text-muted-foreground space-y-1 text-xs">
            {(conversions.data?.items ?? []).map((conversion) => (
              <li key={conversion.id}>x{conversion.factor}</li>
            ))}
            {(conversions.data?.items.length ?? 0) === 0 && <li>No conversions</li>}
          </ul>
          <ConversionForm
            key={`conversion-${skuId}-${nonce}`}
            skuId={skuId}
            uoms={uoms}
            disabled={!canEdit}
            pending={mutations.createUomConversion.isPending}
            conflict={conflictMessage(conversionError) ?? undefined}
            onSubmit={(values) =>
              mutations.createUomConversion.mutate(values, {
                onError: setConversionError,
                onSuccess: () => {
                  setConversionError(null);
                  onCreated();
                },
              })
            }
          />
        </section>

        <section className="space-y-3">
          <h3 className="text-sm font-medium">Item coverage</h3>
          <ul className="text-muted-foreground space-y-1 text-xs">
            {(coverages.data?.items ?? []).map((coverage) => (
              <li key={coverage.id}>WH {coverage.warehouseId}</li>
            ))}
            {(coverages.data?.items.length ?? 0) === 0 && <li>No coverage</li>}
          </ul>
          <CoverageForm
            key={`coverage-${skuId}-${nonce}`}
            skuId={skuId}
            disabled={!canEdit}
            pending={mutations.createItemCoverage.isPending}
            conflict={conflictMessage(coverageError) ?? undefined}
            onSubmit={(values) =>
              mutations.createItemCoverage.mutate(values, {
                onError: setCoverageError,
                onSuccess: () => {
                  setCoverageError(null);
                  onCreated();
                },
              })
            }
          />
        </section>
      </CardContent>
    </Card>
  );
}

function BarcodeForm({
  skuId,
  uoms,
  disabled,
  pending,
  conflict,
  onSubmit,
}: {
  skuId: string;
  uoms: Uom[];
  disabled: boolean;
  pending: boolean;
  conflict?: string;
  onSubmit: (values: SkuBarcodeFormValues) => void;
}) {
  const form = useForm<SkuBarcodeFormValues>({
    resolver: zodResolver(skuBarcodeFormSchema),
    defaultValues: {
      skuId,
      uomId: '',
      barcodeValue: '',
      barcodeType: 'EAN13',
      status: 'Active',
      isPrimary: false,
    },
  });
  const errors = form.formState.errors;
  return (
    <form className="grid gap-2" onSubmit={form.handleSubmit(onSubmit)}>
      <Input placeholder="Barcode value" disabled={disabled} {...form.register('barcodeValue')} />
      {errors.barcodeValue && (
        <span className="text-destructive text-xs">{errors.barcodeValue.message}</span>
      )}
      <Input placeholder="Barcode type" disabled={disabled} {...form.register('barcodeType')} />
      {errors.barcodeType && (
        <span className="text-destructive text-xs">{errors.barcodeType.message}</span>
      )}
      <select
        className="h-9 rounded-md border bg-transparent px-3 text-sm"
        disabled={disabled}
        {...form.register('uomId')}
      >
        <option value="">Select UOM</option>
        {uoms.map((uom) => (
          <option key={uom.id} value={uom.id}>
            {uom.uomCode}
          </option>
        ))}
      </select>
      {errors.uomId && <span className="text-destructive text-xs">{errors.uomId.message}</span>}
      {conflict && (
        <span className="text-destructive text-xs" role="alert">
          {conflict}
        </span>
      )}
      <Button type="submit" size="sm" disabled={disabled || pending}>
        Add barcode
      </Button>
    </form>
  );
}

function ConversionForm({
  skuId,
  uoms,
  disabled,
  pending,
  conflict,
  onSubmit,
}: {
  skuId: string;
  uoms: Uom[];
  disabled: boolean;
  pending: boolean;
  conflict?: string;
  onSubmit: (values: UomConversionFormValues) => void;
}) {
  const form = useForm<UomConversionFormValues>({
    resolver: zodResolver(uomConversionFormSchema),
    defaultValues: {
      skuId,
      fromUomId: '',
      toUomId: '',
      factor: 1,
      effectiveFrom: '',
      status: 'Active',
    },
  });
  const errors = form.formState.errors;
  return (
    <form className="grid gap-2" onSubmit={form.handleSubmit(onSubmit)}>
      <select
        className="h-9 rounded-md border bg-transparent px-3 text-sm"
        disabled={disabled}
        {...form.register('fromUomId')}
      >
        <option value="">From UOM</option>
        {uoms.map((uom) => (
          <option key={uom.id} value={uom.id}>
            {uom.uomCode}
          </option>
        ))}
      </select>
      {errors.fromUomId && (
        <span className="text-destructive text-xs">{errors.fromUomId.message}</span>
      )}
      <select
        className="h-9 rounded-md border bg-transparent px-3 text-sm"
        disabled={disabled}
        {...form.register('toUomId')}
      >
        <option value="">To UOM</option>
        {uoms.map((uom) => (
          <option key={uom.id} value={uom.id}>
            {uom.uomCode}
          </option>
        ))}
      </select>
      {errors.toUomId && <span className="text-destructive text-xs">{errors.toUomId.message}</span>}
      <Input type="number" step="0.000001" placeholder="Factor" disabled={disabled} {...form.register('factor')} />
      {errors.factor && <span className="text-destructive text-xs">{errors.factor.message}</span>}
      <Input type="date" disabled={disabled} {...form.register('effectiveFrom')} />
      {errors.effectiveFrom && (
        <span className="text-destructive text-xs">{errors.effectiveFrom.message}</span>
      )}
      {conflict && (
        <span className="text-destructive text-xs" role="alert">
          {conflict}
        </span>
      )}
      <Button type="submit" size="sm" disabled={disabled || pending}>
        Add conversion
      </Button>
    </form>
  );
}

function CoverageForm({
  skuId,
  disabled,
  pending,
  conflict,
  onSubmit,
}: {
  skuId: string;
  disabled: boolean;
  pending: boolean;
  conflict?: string;
  onSubmit: (values: ItemCoverageFormValues) => void;
}) {
  const form = useForm<ItemCoverageFormValues>({
    resolver: zodResolver(itemCoverageFormSchema),
    defaultValues: {
      skuId,
      warehouseId: '',
      status: 'Active',
      minQty: 0 as unknown as number,
      maxQty: 0 as unknown as number,
      multipleQty: 1 as unknown as number,
    },
  });
  const errors = form.formState.errors;
  return (
    <form className="grid gap-2" onSubmit={form.handleSubmit(onSubmit)}>
      <Input placeholder="Warehouse id" disabled={disabled} {...form.register('warehouseId')} />
      {errors.warehouseId && (
        <span className="text-destructive text-xs">{errors.warehouseId.message}</span>
      )}
      <Input type="number" placeholder="Min qty" disabled={disabled} {...form.register('minQty')} />
      <Input type="number" placeholder="Max qty" disabled={disabled} {...form.register('maxQty')} />
      {errors.maxQty && <span className="text-destructive text-xs">{errors.maxQty.message}</span>}
      {conflict && (
        <span className="text-destructive text-xs" role="alert">
          {conflict}
        </span>
      )}
      <Button type="submit" size="sm" disabled={disabled || pending}>
        Add coverage
      </Button>
    </form>
  );
}
