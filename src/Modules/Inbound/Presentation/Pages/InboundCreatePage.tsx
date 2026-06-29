import { useEffect, useMemo, useState } from 'react';
import type { ChangeEvent, FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Loader2, Plus, Trash2 } from 'lucide-react';

import { ROUTES } from '@app/Config/Routes';
import { Button } from '@shared/Components/Ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '@shared/Components/Ui/Card';
import { Input } from '@shared/Components/Ui/Input';
import { downloadBlob } from '@shared/Utils/DownloadBlob';
import { useInboundMutations } from '@modules/Inbound/Application/Commands/UseInboundMutations';
import { useActiveOwners, useActiveUoms, useSkus } from '@modules/MasterData/Application/Queries/CatalogQueries';
import { useActiveWarehouses } from '@modules/MasterData/Application/Queries/UseSiteLocationTree';
import { usePartners } from '@modules/PartnerMaster/Application/Queries/UsePartners';
import { useWarehouseProfiles } from '@modules/WarehouseProfile/Application/Queries/UseWarehouseProfiles';
import type { InboundLineImportPreview } from '@modules/Inbound/Domain/Types/InboundPlan';

interface DraftLine {
  id: number;
  skuId: string;
  uomId: string;
  expectedQuantity: string;
  externalLineReference: string;
}

interface LookupOption {
  value: string;
  label: string;
}

interface LookupSelectProps {
  id: string;
  name: string;
  label: string;
  value: string;
  placeholder: string;
  options: LookupOption[];
  isLoading: boolean;
  isError: boolean;
  emptyMessage: string;
  errorMessage: string;
  optional?: boolean;
  onChange: (value: string) => void;
}

interface LineImportRow {
  rowNumber: number;
  skuCode: string;
  uomCode: string;
  expectedQuantity: string;
  externalLineReference: string;
  skuId?: string;
  uomId?: string;
  errors: string[];
}

interface LineImportPreview {
  fileName: string;
  rows: LineImportRow[];
  error: string | null;
}

let nextDraftLineId = 0;

const initialLine = (): DraftLine => ({
  id: (nextDraftLineId += 1),
  skuId: '',
  uomId: '',
  expectedQuantity: '1',
  externalLineReference: '',
});

const selectClassName =
  'h-9 rounded-md border bg-transparent px-3 text-sm shadow-sm outline-none transition-colors focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] disabled:cursor-not-allowed disabled:opacity-50';
const lineImportRequiredHeaders = ['skuCode', 'uomCode', 'expectedQuantity'] as const;

function normalizeImportCode(value: string) {
  return value.trim().toUpperCase();
}

function parseCsvLine(line: string) {
  const values: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let index = 0; index < line.length; index += 1) {
    const character = line[index];
    if (character === '"') {
      if (inQuotes && line[index + 1] === '"') {
        current += '"';
        index += 1;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (character === ',' && !inQuotes) {
      values.push(current.trim());
      current = '';
    } else {
      current += character;
    }
  }

  values.push(current.trim());
  return values;
}

function buildLineImportPreview(
  fileName: string,
  text: string,
  skuByCode: Map<string, LookupOption>,
  uomByCode: Map<string, LookupOption>,
): LineImportPreview {
  const lines = text
    .replace(/^\uFEFF/, '')
    .split(/\r?\n/)
    .filter((line) => line.trim().length > 0);

  if (lines.length < 2) {
    return { fileName, rows: [], error: 'CSV cần có header và ít nhất một dòng hàng.' };
  }

  const headers = parseCsvLine(lines[0]).map((header) => header.trim());
  const headerIndex = new Map(headers.map((header, index) => [header, index]));
  const missingHeaders = lineImportRequiredHeaders.filter((header) => !headerIndex.has(header));

  if (missingHeaders.length > 0) {
    return { fileName, rows: [], error: `CSV thiếu cột bắt buộc: ${missingHeaders.join(', ')}.` };
  }

  const seenExternalReferences = new Set<string>();
  const rows = lines.slice(1).map((line, index) => {
    const values = parseCsvLine(line);
    const skuCode = values[headerIndex.get('skuCode') as number]?.trim() ?? '';
    const uomCode = values[headerIndex.get('uomCode') as number]?.trim() ?? '';
    const expectedQuantity = values[headerIndex.get('expectedQuantity') as number]?.trim() ?? '';
    const externalLineReferenceIndex = headerIndex.get('externalLineReference');
    const externalLineReference =
      externalLineReferenceIndex === undefined ? '' : (values[externalLineReferenceIndex]?.trim() ?? '');
    const skuOption = skuByCode.get(normalizeImportCode(skuCode));
    const uomOption = uomByCode.get(normalizeImportCode(uomCode));
    const quantity = Number(expectedQuantity);
    const errors: string[] = [];

    if (!skuCode) {
      errors.push('Thiếu skuCode.');
    } else if (!skuOption) {
      errors.push(`SKU ${skuCode} không tồn tại hoặc không active.`);
    }

    if (!uomCode) {
      errors.push('Thiếu uomCode.');
    } else if (!uomOption) {
      errors.push(`Đơn vị tính ${uomCode} không tồn tại hoặc không active.`);
    }

    if (!expectedQuantity || !Number.isFinite(quantity) || quantity <= 0) {
      errors.push('expectedQuantity phải lớn hơn 0.');
    }

    if (externalLineReference) {
      const referenceKey = normalizeImportCode(externalLineReference);
      if (seenExternalReferences.has(referenceKey)) {
        errors.push(`externalLineReference ${externalLineReference} bị trùng trong file.`);
      }
      seenExternalReferences.add(referenceKey);
    }

    return {
      rowNumber: index + 2,
      skuCode,
      uomCode,
      expectedQuantity,
      externalLineReference,
      skuId: skuOption?.value,
      uomId: uomOption?.value,
      errors,
    };
  });

  return { fileName, rows, error: null };
}

function previewHasErrors(preview: LineImportPreview | null) {
  return Boolean(preview?.error || preview?.rows.some((row) => row.errors.length > 0));
}

function readTextFile(file: File) {
  if (typeof file.text === 'function') {
    return file.text();
  }

  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result;
      resolve(typeof result === 'string' ? result : '');
    };
    reader.onerror = () => reject(reader.error ?? new Error('Không đọc được file CSV.'));
    reader.readAsText(file, 'UTF-8');
  });
}

function LookupSelect({
  id,
  name,
  label,
  value,
  placeholder,
  options,
  isLoading,
  isError,
  emptyMessage,
  errorMessage,
  optional = false,
  onChange,
}: LookupSelectProps) {
  const hasOptions = options.length > 0;
  const disabled = isLoading || isError || (!optional && !hasOptions) || (optional && !hasOptions);
  const helperId = `${id}-helper`;
  const helperText = isLoading
    ? 'Đang tải danh sách...'
    : isError
      ? errorMessage
      : !hasOptions
        ? emptyMessage
        : null;

  return (
    <label className="grid gap-1 text-sm" htmlFor={id}>
      {label}
      <select
        id={id}
        name={name}
        className={selectClassName}
        value={value}
        disabled={disabled}
        aria-describedby={helperText ? helperId : undefined}
        onChange={(event) => onChange(event.target.value)}
      >
        <option value="">{isLoading ? 'Đang tải...' : placeholder}</option>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      {helperText ? (
        <span id={helperId} className="text-muted-foreground text-xs">
          {helperText}
        </span>
      ) : null}
    </label>
  );
}

export function InboundCreatePage() {
  const navigate = useNavigate();
  const mutations = useInboundMutations();
  const supplierQuery = usePartners({ partnerType: 'Supplier', status: 'Active', pageSize: 100 });
  const ownerQuery = useActiveOwners();
  const warehouseQuery = useActiveWarehouses();
  const warehouseProfileQuery = useWarehouseProfiles({ status: 'ACTIVE', pageSize: 100 });
  const skuQuery = useSkus({ itemStatus: 'Active', pageSize: 100 });
  const uomQuery = useActiveUoms();
  const [sourceSystem, setSourceSystem] = useState('');
  const [sourceDocumentType, setSourceDocumentType] = useState('ASN');
  const [sourceDocumentNumber, setSourceDocumentNumber] = useState('');
  const [supplierId, setSupplierId] = useState('');
  const [ownerId, setOwnerId] = useState('');
  const [warehouseId, setWarehouseId] = useState('');
  const [warehouseProfileId, setWarehouseProfileId] = useState('');
  const [expectedArrivalAt, setExpectedArrivalAt] = useState('');
  const [lineDrafts, setLineDrafts] = useState<DraftLine[]>(() => [initialLine()]);
  const [lineImportPreview, setLineImportPreview] = useState<LineImportPreview | null>(null);
  const [excelFile, setExcelFile] = useState<File | null>(null);
  const [excelPreview, setExcelPreview] = useState<InboundLineImportPreview | null>(null);

  const canCreate = Boolean(
    sourceSystem.trim() &&
      sourceDocumentNumber.trim() &&
      supplierId.trim() &&
      ownerId.trim() &&
      warehouseId.trim() &&
      lineDrafts.every(
        (line) => line.skuId.trim() && line.uomId.trim() && Number(line.expectedQuantity) > 0,
      ),
  );
  const totalExpectedQuantity = useMemo(
    () => lineDrafts.reduce((sum, line) => sum + (Number(line.expectedQuantity) || 0), 0),
    [lineDrafts],
  );
  const supplierOptions = useMemo(
    () =>
      (supplierQuery.data?.items ?? []).map((supplier) => ({
        value: supplier.id,
        label: `${supplier.partnerCode} - ${supplier.partnerName}`,
      })),
    [supplierQuery.data?.items],
  );
  const ownerOptions = useMemo(
    () =>
      (ownerQuery.data?.items ?? []).map((owner) => ({
        value: owner.id,
        label: `${owner.ownerCode} - ${owner.ownerName}`,
      })),
    [ownerQuery.data?.items],
  );
  const warehouseOptions = useMemo(
    () =>
      (warehouseQuery.data?.items ?? []).map((warehouse) => ({
        value: warehouse.id,
        label: `${warehouse.warehouseCode} - ${warehouse.warehouseName}`,
      })),
    [warehouseQuery.data?.items],
  );
  const warehouseProfileOptions = useMemo(
    () =>
      (warehouseProfileQuery.data?.items ?? []).map((profile) => ({
        value: profile.id,
        label: `${profile.profileCode} - ${profile.profileName}`,
      })),
    [warehouseProfileQuery.data?.items],
  );
  const skuOptions = useMemo(
    () =>
      (skuQuery.data?.items ?? []).map((sku) => ({
        value: sku.id,
        label: `${sku.skuCode} - ${sku.skuName}`,
      })),
    [skuQuery.data?.items],
  );
  const uomOptions = useMemo(
    () =>
      (uomQuery.data?.items ?? []).map((uom) => ({
        value: uom.id,
        label: `${uom.uomCode} - ${uom.uomName}`,
      })),
    [uomQuery.data?.items],
  );
  const skuByCode = useMemo(() => {
    return new Map(
      (skuQuery.data?.items ?? []).map((sku) => [
        normalizeImportCode(sku.skuCode),
        { value: sku.id, label: `${sku.skuCode} - ${sku.skuName}` },
      ]),
    );
  }, [skuQuery.data?.items]);
  const uomByCode = useMemo(() => {
    return new Map(
      (uomQuery.data?.items ?? []).map((uom) => [
        normalizeImportCode(uom.uomCode),
        { value: uom.id, label: `${uom.uomCode} - ${uom.uomName}` },
      ]),
    );
  }, [uomQuery.data?.items]);
  const canImportLines =
    !skuQuery.isLoading &&
    !uomQuery.isLoading &&
    !skuQuery.isError &&
    !uomQuery.isError &&
    skuOptions.length > 0 &&
    uomOptions.length > 0;
  const lineImportHasErrors = previewHasErrors(lineImportPreview);

  function updateLine(id: number, patch: Partial<DraftLine>) {
    setLineDrafts((lines) => lines.map((line) => (line.id === id ? { ...line, ...patch } : line)));
  }

  function removeLine(id: number) {
    setLineDrafts((lines) => (lines.length === 1 ? lines : lines.filter((line) => line.id !== id)));
  }

  async function handleLineImportFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const text = await readTextFile(file);
      setLineImportPreview(buildLineImportPreview(file.name, text, skuByCode, uomByCode));
    } catch {
      setLineImportPreview({ fileName: file.name, rows: [], error: 'Không đọc được file CSV.' });
    } finally {
      event.target.value = '';
    }
  }

  function applyLineImport() {
    if (!lineImportPreview || lineImportHasErrors || lineImportPreview.rows.length === 0) return;

    setLineDrafts(
      lineImportPreview.rows.map((row) => ({
        id: (nextDraftLineId += 1),
        skuId: row.skuId ?? '',
        uomId: row.uomId ?? '',
        expectedQuantity: row.expectedQuantity,
        externalLineReference: row.externalLineReference,
      })),
    );
    setLineImportPreview(null);
  }

  // ── Import Excel server-side (IFB-03) ───────────────────────────────────────
  const canImportScope = Boolean(warehouseId.trim() && ownerId.trim());
  const importHeaderReady = Boolean(
    canImportScope && sourceSystem.trim() && sourceDocumentNumber.trim() && supplierId.trim(),
  );
  const excelImportHasErrors = Boolean(
    excelPreview && (excelPreview.headerError || excelPreview.summary.invalid > 0),
  );
  const canCommitExcel = Boolean(importHeaderReady && excelFile && excelPreview && !excelImportHasErrors);

  // Preview được BE validate theo scope (Kho + Chủ hàng). Đổi scope làm preview cũ hết hiệu lực
  // — bỏ file + preview để buộc upload lại, tránh commit file đã validate theo scope khác.
  // ponytail: nếu có preview đang in-flight khi đổi scope, onSuccess trễ có thể set lại
  // excelPreview, nhưng KHÔNG set lại excelFile → canCommitExcel vẫn false (không commit nhầm).
  useEffect(() => {
    setExcelFile(null);
    setExcelPreview(null);
  }, [warehouseId, ownerId]);

  function handleDownloadTemplate() {
    mutations.downloadLineImportTemplate.mutate(undefined, {
      onSuccess: (blob) => downloadBlob(blob, 'inbound-line-template.xlsx'),
    });
  }

  function handleExcelFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0] ?? null;
    // Reset value để chọn lại CÙNG file vẫn re-fire onChange (sau lỗi preview hoặc đổi scope).
    event.target.value = '';
    setExcelFile(file);
    setExcelPreview(null);
    if (file && canImportScope) {
      mutations.previewLineImport.mutate(
        { file, scope: { warehouseId: warehouseId.trim(), ownerId: ownerId.trim() } },
        { onSuccess: setExcelPreview },
      );
    }
  }

  function commitExcelImport() {
    if (!excelFile || !canCommitExcel) return;
    mutations.commitLineImport.mutate(
      {
        file: excelFile,
        header: {
          sourceSystem: sourceSystem.trim(),
          sourceDocumentType: sourceDocumentType.trim() || 'ASN',
          sourceDocumentNumber: sourceDocumentNumber.trim(),
          supplierId: supplierId.trim(),
          ownerId: ownerId.trim(),
          warehouseId: warehouseId.trim(),
          warehouseProfileId: warehouseProfileId.trim() || null,
          expectedArrivalAt: expectedArrivalAt ? new Date(expectedArrivalAt).toISOString() : null,
        },
      },
      { onSuccess: (plan) => void navigate(ROUTES.INBOUND.DETAIL(plan.id)) },
    );
  }

  function submitCreate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!canCreate) return;
    mutations.createInboundPlan.mutate(
      {
        sourceSystem: sourceSystem.trim(),
        sourceDocumentType: sourceDocumentType.trim() || 'ASN',
        sourceDocumentNumber: sourceDocumentNumber.trim(),
        supplierId: supplierId.trim(),
        ownerId: ownerId.trim(),
        warehouseId: warehouseId.trim(),
        warehouseProfileId: warehouseProfileId.trim() || null,
        expectedArrivalAt: expectedArrivalAt ? new Date(expectedArrivalAt).toISOString() : null,
        lines: lineDrafts.map((line, index) => ({
          lineNumber: index + 1,
          skuId: line.skuId.trim(),
          uomId: line.uomId.trim(),
          expectedQuantity: Number(line.expectedQuantity),
          externalLineReference: line.externalLineReference.trim() || null,
        })),
      },
      {
        onSuccess: (plan) => {
          void navigate(ROUTES.INBOUND.DETAIL(plan.id));
        },
      },
    );
  }

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-4">
      <header className="space-y-1">
        <p className="text-muted-foreground text-sm">Nhập kho</p>
        <h1 className="text-2xl font-semibold tracking-normal">Tạo kế hoạch nhập kho</h1>
        <p className="text-muted-foreground text-sm">
          Tạo chứng từ nguồn và dòng hàng dự kiến. Các bước vào cổng, tiếp nhận, QC và release cất hàng
          được xử lý sau khi mở trang chi tiết kế hoạch.
        </p>
      </header>

      <form className="space-y-4" onSubmit={submitCreate}>
        <Card>
          <CardHeader>
            <CardTitle>Thông tin chứng từ nguồn</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3 sm:grid-cols-2">
            <label className="grid gap-1 text-sm" htmlFor="inbound-source-system">
              Hệ thống nguồn
              <Input
                id="inbound-source-system"
                name="sourceSystem"
                value={sourceSystem}
                onChange={(event) => setSourceSystem(event.target.value)}
                placeholder="ERP"
              />
            </label>
            <label className="grid gap-1 text-sm" htmlFor="inbound-source-document-type">
              Loại chứng từ nguồn
              <Input
                id="inbound-source-document-type"
                name="sourceDocumentType"
                value={sourceDocumentType}
                onChange={(event) => setSourceDocumentType(event.target.value)}
                placeholder="ASN"
              />
            </label>
            <label className="grid gap-1 text-sm" htmlFor="inbound-source-document-number">
              Số chứng từ nguồn
              <Input
                id="inbound-source-document-number"
                name="sourceDocumentNumber"
                value={sourceDocumentNumber}
                onChange={(event) => setSourceDocumentNumber(event.target.value)}
                placeholder="ASN-10001"
              />
            </label>
            <label className="grid gap-1 text-sm" htmlFor="inbound-expected-arrival-at">
              Thời gian đến dự kiến
              <Input
                id="inbound-expected-arrival-at"
                name="expectedArrivalAt"
                type="datetime-local"
                value={expectedArrivalAt}
                onChange={(event) => setExpectedArrivalAt(event.target.value)}
              />
            </label>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Đối tượng và kho</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3 sm:grid-cols-2">
            <LookupSelect
              id="inbound-supplier-id"
              name="supplierId"
              label="Nhà cung cấp"
              value={supplierId}
              placeholder="Chọn nhà cung cấp"
              options={supplierOptions}
              isLoading={supplierQuery.isLoading}
              isError={supplierQuery.isError}
              emptyMessage="Chưa có nhà cung cấp active để chọn."
              errorMessage="Không tải được danh sách nhà cung cấp."
              onChange={setSupplierId}
            />
            <LookupSelect
              id="inbound-owner-id"
              name="ownerId"
              label="Chủ hàng"
              value={ownerId}
              placeholder="Chọn chủ hàng"
              options={ownerOptions}
              isLoading={ownerQuery.isLoading}
              isError={ownerQuery.isError}
              emptyMessage="Chưa có chủ hàng active để chọn."
              errorMessage="Không tải được danh sách chủ hàng."
              onChange={setOwnerId}
            />
            <LookupSelect
              id="inbound-warehouse-id"
              name="warehouseId"
              label="Kho"
              value={warehouseId}
              placeholder="Chọn kho"
              options={warehouseOptions}
              isLoading={warehouseQuery.isLoading}
              isError={warehouseQuery.isError}
              emptyMessage="Chưa có kho active để chọn."
              errorMessage="Không tải được danh sách kho."
              onChange={setWarehouseId}
            />
            <LookupSelect
              id="inbound-warehouse-profile-id"
              name="warehouseProfileId"
              label="Hồ sơ kho"
              value={warehouseProfileId}
              placeholder="Không chọn hồ sơ kho"
              options={warehouseProfileOptions}
              isLoading={warehouseProfileQuery.isLoading}
              isError={warehouseProfileQuery.isError}
              emptyMessage="Chưa có hồ sơ kho active để chọn."
              errorMessage="Không tải được danh sách hồ sơ kho."
              optional
              onChange={setWarehouseProfileId}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Import Excel hàng loạt (tùy chọn)</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex flex-wrap items-end gap-3">
              <Button
                id="inbound-download-template"
                name="downloadTemplate"
                type="button"
                variant="secondary"
                onClick={handleDownloadTemplate}
                disabled={mutations.downloadLineImportTemplate.isPending}
              >
                {mutations.downloadLineImportTemplate.isPending ? (
                  <Loader2 className="size-4 animate-spin" aria-hidden="true" />
                ) : null}
                Tải template Excel
              </Button>
              <label className="grid gap-1 text-sm" htmlFor="inbound-excel-import">
                Import Excel dòng hàng (.xlsx)
                <Input
                  id="inbound-excel-import"
                  name="excelImport"
                  type="file"
                  accept=".xlsx"
                  disabled={!canImportScope || mutations.previewLineImport.isPending}
                  onChange={handleExcelFileChange}
                />
              </label>
            </div>
            <p className="text-muted-foreground text-xs">
              Tải template, điền dòng hàng rồi tải lên. Cần chọn Kho và Chủ hàng trước khi import. File được đọc và
              kiểm tra ở máy chủ — phù hợp số lượng dòng lớn (1000–2000).
            </p>
            {!canImportScope ? (
              <p className="text-muted-foreground text-xs">Chọn Kho và Chủ hàng ở trên để bật import Excel.</p>
            ) : null}
            {mutations.previewLineImport.isPending ? (
              <p className="text-muted-foreground text-sm">Đang kiểm tra file...</p>
            ) : null}
            {excelPreview ? (
              <div
                className="space-y-2 rounded-md bg-muted/30 p-3 text-sm"
                data-testid="inbound-excel-import-preview"
              >
                <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                  <p className="font-medium">Preview {excelPreview.fileName}</p>
                  <p className={excelImportHasErrors ? 'text-destructive' : 'text-emerald-700'}>
                    Tổng {excelPreview.summary.total} · Hợp lệ {excelPreview.summary.valid} · Lỗi{' '}
                    {excelPreview.summary.invalid}
                  </p>
                </div>
                {excelPreview.headerError ? (
                  <p className="text-destructive">{excelPreview.headerError}</p>
                ) : null}
                {excelPreview.rows.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[640px] text-left text-xs">
                      <thead className="text-muted-foreground">
                        <tr>
                          <th className="py-2 pr-3">Dòng</th>
                          <th className="py-2 pr-3">SKU</th>
                          <th className="py-2 pr-3">Đơn vị tính</th>
                          <th className="py-2 pr-3">Số lượng</th>
                          <th className="py-2 pr-3">Tham chiếu</th>
                          <th className="py-2 pr-3">Trạng thái</th>
                        </tr>
                      </thead>
                      <tbody>
                        {excelPreview.rows.slice(0, 50).map((row) => (
                          <tr key={row.rowNumber} className="border-t">
                            <td className="py-2 pr-3">{row.rowNumber}</td>
                            <td className="py-2 pr-3">{row.skuCode}</td>
                            <td className="py-2 pr-3">{row.uomCode}</td>
                            <td className="py-2 pr-3">{row.expectedQuantity}</td>
                            <td className="py-2 pr-3">{row.externalLineReference || '-'}</td>
                            <td className={row.errors.length > 0 ? 'py-2 pr-3 text-destructive' : 'py-2 pr-3'}>
                              {row.errors.length > 0 ? row.errors.join(' ') : 'Hợp lệ'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    {excelPreview.rows.length > 50 ? (
                      <p className="text-muted-foreground mt-2 text-xs">
                        … và {excelPreview.rows.length - 50} dòng nữa.
                      </p>
                    ) : null}
                  </div>
                ) : null}
                <Button
                  id="inbound-excel-commit"
                  name="commitExcelImport"
                  type="button"
                  disabled={!canCommitExcel || mutations.commitLineImport.isPending}
                  onClick={commitExcelImport}
                >
                  {mutations.commitLineImport.isPending ? (
                    <Loader2 className="size-4 animate-spin" aria-hidden="true" />
                  ) : null}
                  Tạo từ file
                </Button>
                {!importHeaderReady ? (
                  <p className="text-muted-foreground text-xs">
                    Cần nhập đủ Hệ thống nguồn, Số chứng từ, Nhà cung cấp, Kho, Chủ hàng để tạo từ file.
                  </p>
                ) : null}
              </div>
            ) : null}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <CardTitle>Dòng hàng dự kiến</CardTitle>
              <Button
                id="inbound-add-line"
                name="addLine"
                type="button"
                variant="secondary"
                onClick={() => setLineDrafts((lines) => [...lines, initialLine()])}
              >
                <Plus className="size-4" aria-hidden="true" />
                Thêm dòng
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-3 rounded-md border border-dashed p-3">
              <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
                <label className="grid gap-1 text-sm" htmlFor="inbound-lines-csv-import">
                  Import CSV dòng hàng dự kiến
                  <Input
                    id="inbound-lines-csv-import"
                    name="lineImportCsv"
                    type="file"
                    accept=".csv,text/csv"
                    disabled={!canImportLines}
                    onChange={handleLineImportFile}
                  />
                </label>
                <Button
                  id="inbound-lines-apply-import"
                  name="applyLineImport"
                  type="button"
                  variant="secondary"
                  disabled={!lineImportPreview || lineImportHasErrors || lineImportPreview.rows.length === 0}
                  onClick={applyLineImport}
                >
                  Áp dụng import
                </Button>
              </div>
              <p className="text-muted-foreground text-xs">
                CSV UTF-8 dùng header `skuCode,uomCode,expectedQuantity,externalLineReference`. Import sẽ thay thế
                danh sách dòng hiện tại sau khi preview sạch lỗi.
              </p>
              {!canImportLines ? (
                <p className="text-muted-foreground text-xs">
                  Cần tải xong danh sách SKU và đơn vị tính active trước khi import.
                </p>
              ) : null}
              {lineImportPreview ? (
                <div className="space-y-2 rounded-md bg-muted/30 p-3 text-sm" data-testid="inbound-line-import-preview">
                  <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                    <p className="font-medium">Preview file {lineImportPreview.fileName}</p>
                    <p className={lineImportHasErrors ? 'text-destructive' : 'text-emerald-700'}>
                      {lineImportHasErrors ? 'Có lỗi cần sửa trước khi áp dụng' : 'Preview hợp lệ'}
                    </p>
                  </div>
                  {lineImportPreview.error ? <p className="text-destructive">{lineImportPreview.error}</p> : null}
                  {lineImportPreview.rows.length > 0 ? (
                    <div className="overflow-x-auto">
                      <table className="w-full min-w-[720px] text-left text-xs">
                        <thead className="text-muted-foreground">
                          <tr>
                            <th className="py-2 pr-3">Dòng</th>
                            <th className="py-2 pr-3">SKU</th>
                            <th className="py-2 pr-3">Đơn vị tính</th>
                            <th className="py-2 pr-3">Số lượng</th>
                            <th className="py-2 pr-3">Tham chiếu</th>
                            <th className="py-2 pr-3">Trạng thái</th>
                          </tr>
                        </thead>
                        <tbody>
                          {lineImportPreview.rows.map((row) => (
                            <tr key={row.rowNumber} className="border-t">
                              <td className="py-2 pr-3">{row.rowNumber}</td>
                              <td className="py-2 pr-3">{row.skuCode}</td>
                              <td className="py-2 pr-3">{row.uomCode}</td>
                              <td className="py-2 pr-3">{row.expectedQuantity}</td>
                              <td className="py-2 pr-3">{row.externalLineReference || '-'}</td>
                              <td className={row.errors.length > 0 ? 'py-2 pr-3 text-destructive' : 'py-2 pr-3'}>
                                {row.errors.length > 0 ? row.errors.join(' ') : 'Hợp lệ'}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : null}
                </div>
              ) : null}
            </div>
            {lineDrafts.map((line, index) => (
              <div key={line.id} className="grid gap-3 rounded-md border p-3 lg:grid-cols-[1fr_1fr_1fr_1fr_auto]">
                <LookupSelect
                  id={`inbound-line-${line.id}-sku-id`}
                  name={`lines[${index}].skuId`}
                  label="SKU"
                  value={line.skuId}
                  placeholder="Chọn SKU"
                  options={skuOptions}
                  isLoading={skuQuery.isLoading}
                  isError={skuQuery.isError}
                  emptyMessage="Chưa có SKU active để chọn."
                  errorMessage="Không tải được danh sách SKU."
                  onChange={(value) => updateLine(line.id, { skuId: value })}
                />
                <LookupSelect
                  id={`inbound-line-${line.id}-uom-id`}
                  name={`lines[${index}].uomId`}
                  label="Đơn vị tính"
                  value={line.uomId}
                  placeholder="Chọn đơn vị tính"
                  options={uomOptions}
                  isLoading={uomQuery.isLoading}
                  isError={uomQuery.isError}
                  emptyMessage="Chưa có đơn vị tính active để chọn."
                  errorMessage="Không tải được danh sách đơn vị tính."
                  onChange={(value) => updateLine(line.id, { uomId: value })}
                />
                <label className="grid gap-1 text-sm" htmlFor={`inbound-line-${line.id}-expected-quantity`}>
                  Số lượng dự kiến
                  <Input
                    id={`inbound-line-${line.id}-expected-quantity`}
                    name={`lines[${index}].expectedQuantity`}
                    type="number"
                    min="0.0001"
                    step="any"
                    value={line.expectedQuantity}
                    onChange={(event) => updateLine(line.id, { expectedQuantity: event.target.value })}
                  />
                </label>
                <label className="grid gap-1 text-sm" htmlFor={`inbound-line-${line.id}-external-reference`}>
                  Tham chiếu dòng ngoài
                  <Input
                    id={`inbound-line-${line.id}-external-reference`}
                    name={`lines[${index}].externalLineReference`}
                    value={line.externalLineReference}
                    onChange={(event) => updateLine(line.id, { externalLineReference: event.target.value })}
                    placeholder="10"
                  />
                </label>
                <Button
                  id={`inbound-line-${line.id}-remove`}
                  name={`lines[${index}].remove`}
                  type="button"
                  variant="secondary"
                  size="icon"
                  className="self-end"
                  aria-label={`Xóa dòng ${index + 1}`}
                  disabled={lineDrafts.length === 1}
                  onClick={() => removeLine(line.id)}
                >
                  <Trash2 className="size-4" aria-hidden="true" />
                </Button>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Tóm tắt trước khi tạo</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-2 text-sm sm:grid-cols-3">
            <div>
              <p className="text-muted-foreground">Số dòng</p>
              <p className="font-medium">{lineDrafts.length}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Tổng số lượng dự kiến</p>
              <p className="font-medium">{totalExpectedQuantity}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Trạng thái form</p>
              <p className="font-medium">{canCreate ? 'Đủ thông tin tạo kế hoạch' : 'Cần bổ sung thông tin bắt buộc'}</p>
            </div>
          </CardContent>
        </Card>

        {mutations.createInboundPlan.error ? (
          <p className="text-destructive text-sm">Không thể tạo kế hoạch nhập kho.</p>
        ) : null}

        <div className="flex flex-col-reverse gap-2 border-t pt-3 sm:flex-row sm:justify-end">
          <Button asChild variant="secondary">
            <Link to={ROUTES.INBOUND.ROOT}>Hủy</Link>
          </Button>
          <Button
            id="inbound-create-submit"
            name="createInboundPlan"
            type="submit"
            disabled={!canCreate || mutations.createInboundPlan.isPending}
          >
            {mutations.createInboundPlan.isPending ? <Loader2 className="size-4 animate-spin" aria-hidden="true" /> : null}
            Tạo kế hoạch nhập kho
          </Button>
        </div>
      </form>
    </div>
  );
}
