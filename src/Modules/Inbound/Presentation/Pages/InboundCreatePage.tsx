import { useEffect, useMemo, useState } from 'react';
import type { ChangeEvent, FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Loader2, Plus, Trash2, Upload, X } from 'lucide-react';

import { ROUTES } from '@app/Config/Routes';
import { Button } from '@shared/Components/Ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '@shared/Components/Ui/Card';
import { Input } from '@shared/Components/Ui/Input';
import { downloadBlob } from '@shared/Utils/DownloadBlob';
import { LookupSelect } from '@shared/Components/Ui/LookupSelect';
import { SearchableLookupSelect } from '@shared/Components/Ui/SearchableLookupSelect';
import { useDebouncedValue } from '@shared/Hooks/UseDebouncedValue';
import { useInboundMutations } from '@modules/Inbound/Application/Commands/UseInboundMutations';
import {
  useActiveOwners,
  useActiveUoms,
  useSkus,
} from '@modules/MasterData/Application/Queries/CatalogQueries';
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

let nextDraftLineId = 0;

const initialLine = (): DraftLine => ({
  id: (nextDraftLineId += 1),
  skuId: '',
  uomId: '',
  expectedQuantity: '1',
  externalLineReference: '',
});

export function InboundCreatePage() {
  const navigate = useNavigate();
  const mutations = useInboundMutations();
  const supplierQuery = usePartners({ partnerType: 'Supplier', status: 'Active', pageSize: 100 });
  const ownerQuery = useActiveOwners();
  const [warehouseSearch, setWarehouseSearch] = useState('');
  const debouncedWarehouseSearch = useDebouncedValue(warehouseSearch, 300);
  const warehouseQuery = useActiveWarehouses(debouncedWarehouseSearch);
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
  const [excelFile, setExcelFile] = useState<File | null>(null);
  const [excelPreview, setExcelPreview] = useState<InboundLineImportPreview | null>(null);
  const [importOpen, setImportOpen] = useState(false);

  // Review-fix (IFB-16): typing a new search term can narrow `warehouseOptions` below the
  // already-selected warehouse, and LookupSelect's stale-value fallback then shows its raw id
  // instead of its name. Clearing the selection on every search edit keeps the dropdown always
  // showing a real, human-readable choice -- the user just re-picks from the fresh list.
  function handleWarehouseSearchChange(value: string) {
    setWarehouseSearch(value);
    setWarehouseId('');
  }

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
  function updateLine(id: number, patch: Partial<DraftLine>) {
    setLineDrafts((lines) => lines.map((line) => (line.id === id ? { ...line, ...patch } : line)));
  }

  function removeLine(id: number) {
    setLineDrafts((lines) => (lines.length === 1 ? lines : lines.filter((line) => line.id !== id)));
  }

  // ── Import Excel server-side (IFB-03) ───────────────────────────────────────
  const canImportScope = Boolean(warehouseId.trim() && ownerId.trim());
  const importHeaderReady = Boolean(
    canImportScope && sourceSystem.trim() && sourceDocumentNumber.trim() && supplierId.trim(),
  );
  const excelImportHasErrors = Boolean(
    excelPreview && (excelPreview.headerError || excelPreview.summary.invalid > 0),
  );
  const canCommitExcel = Boolean(
    importHeaderReady && excelFile && excelPreview && !excelImportHasErrors,
  );

  // Preview được BE validate theo scope (Kho + Chủ hàng). Đổi scope làm preview cũ hết hiệu lực
  // — bỏ file + preview để buộc upload lại, tránh commit file đã validate theo scope khác.
  // ponytail: nếu có preview đang in-flight khi đổi scope, onSuccess trễ có thể set lại
  // excelPreview, nhưng KHÔNG set lại excelFile → canCommitExcel vẫn false (không commit nhầm).
  useEffect(() => {
    setExcelFile(null);
    setExcelPreview(null);
  }, [warehouseId, ownerId]);

  // Đóng popup import bằng phím Escape (mirror pattern InboundDiscrepancySheet).
  useEffect(() => {
    if (!importOpen) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setImportOpen(false);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [importOpen]);

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
          Tạo chứng từ nguồn và dòng hàng dự kiến. Các bước vào cổng, tiếp nhận, QC và release cất
          hàng được xử lý sau khi mở trang chi tiết kế hoạch.
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
            <SearchableLookupSelect
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
              searchValue={warehouseSearch}
              onSearchChange={handleWarehouseSearchChange}
              searchPlaceholder="Tìm theo mã/tên kho..."
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

        {importOpen ? (
          <div
            className="bg-background/80 fixed inset-0 z-50 flex items-end justify-center p-0 backdrop-blur-sm md:items-center md:p-6"
            data-testid="inbound-import-overlay"
            role="presentation"
          >
            <button
              type="button"
              className="absolute inset-0 cursor-default"
              aria-label="Đóng import Excel"
              onClick={() => setImportOpen(false)}
            />
            <section
              aria-labelledby="inbound-import-title"
              aria-modal="true"
              role="dialog"
              className="bg-card relative flex max-h-[92vh] w-full flex-col overflow-hidden rounded-t-xl border shadow-lg md:max-w-2xl md:rounded-md"
            >
              <header className="flex items-start justify-between gap-3 border-b px-4 py-3">
                <div className="min-w-0">
                  <h2 id="inbound-import-title" className="text-base font-semibold">
                    Import Excel hàng loạt
                  </h2>
                  <p className="text-muted-foreground mt-1 text-sm">
                    Tải template, điền dòng hàng rồi tải lên — kiểm tra ở máy chủ và tạo kế hoạch
                    nhiều dòng (1000–2000).
                  </p>
                </div>
                <button
                  type="button"
                  className="grid size-10 shrink-0 place-items-center rounded-md border hover:bg-muted"
                  onClick={() => setImportOpen(false)}
                  aria-label="Đóng import Excel"
                >
                  <X className="size-4" />
                </button>
              </header>
              <div className="space-y-4 overflow-y-auto px-4 py-4">
                <div className="space-y-2">
                  <span className="text-sm font-medium">Bước 1 — Tải template</span>
                  <div>
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
                      Tải template Excel (.xlsx)
                    </Button>
                  </div>
                </div>

                <div className="space-y-2">
                  <span className="text-sm font-medium">
                    Bước 2 — Điền template rồi tải file lên
                  </span>
                  <div className="flex flex-wrap items-center gap-3">
                    <label
                      htmlFor="inbound-excel-import"
                      className={`inline-flex h-9 items-center gap-2 rounded-md border px-3 text-sm shadow-sm transition-colors ${
                        !canImportScope || mutations.previewLineImport.isPending
                          ? 'pointer-events-none opacity-50'
                          : 'hover:bg-muted/50 cursor-pointer'
                      }`}
                    >
                      {mutations.previewLineImport.isPending ? (
                        <Loader2 className="size-4 animate-spin" aria-hidden="true" />
                      ) : (
                        <Upload className="size-4" aria-hidden="true" />
                      )}
                      {excelFile ? 'Chọn file khác' : 'Chọn file Excel (.xlsx)'}
                    </label>
                    <span className="text-muted-foreground text-sm">
                      {excelFile ? excelFile.name : 'Chưa chọn file'}
                    </span>
                    <input
                      id="inbound-excel-import"
                      name="excelImport"
                      type="file"
                      accept=".xlsx"
                      className="sr-only"
                      disabled={!canImportScope || mutations.previewLineImport.isPending}
                      onChange={handleExcelFileChange}
                    />
                  </div>
                  {!canImportScope ? (
                    <p className="text-muted-foreground text-xs">
                      Cần chọn <span className="font-medium">Kho</span> và{' '}
                      <span className="font-medium">Chủ hàng</span> ở form trước khi tải file.
                    </p>
                  ) : null}
                  {mutations.previewLineImport.isPending ? (
                    <p className="text-muted-foreground text-sm">Đang kiểm tra file ở máy chủ...</p>
                  ) : null}
                </div>
                {excelPreview ? (
                  <div
                    className="space-y-2 rounded-md bg-muted/30 p-3 text-sm"
                    data-testid="inbound-excel-import-preview"
                  >
                    <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                      <p className="font-medium">Preview {excelPreview.fileName}</p>
                      <p className={excelImportHasErrors ? 'text-destructive' : 'text-emerald-700'}>
                        Tổng {excelPreview.summary.total} · Hợp lệ {excelPreview.summary.valid} ·
                        Lỗi {excelPreview.summary.invalid}
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
                                <td
                                  className={
                                    row.errors.length > 0
                                      ? 'py-2 pr-3 text-destructive'
                                      : 'py-2 pr-3'
                                  }
                                >
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
                        Cần nhập đủ Hệ thống nguồn, Số chứng từ, Nhà cung cấp, Kho, Chủ hàng để tạo
                        từ file.
                      </p>
                    ) : null}
                  </div>
                ) : null}
              </div>
            </section>
          </div>
        ) : null}

        <Card>
          <CardHeader>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <CardTitle>Dòng hàng dự kiến</CardTitle>
              <div className="flex flex-wrap gap-2">
                <Button
                  id="inbound-open-import"
                  name="openImport"
                  type="button"
                  variant="secondary"
                  onClick={() => setImportOpen(true)}
                >
                  <Upload className="size-4" aria-hidden="true" />
                  Import Excel
                </Button>
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
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {lineDrafts.map((line, index) => (
              <div
                key={line.id}
                className="grid gap-3 rounded-md border p-3 lg:grid-cols-[1fr_1fr_1fr_1fr_auto]"
              >
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
                <label
                  className="grid gap-1 text-sm"
                  htmlFor={`inbound-line-${line.id}-expected-quantity`}
                >
                  Số lượng dự kiến
                  <Input
                    id={`inbound-line-${line.id}-expected-quantity`}
                    name={`lines[${index}].expectedQuantity`}
                    type="number"
                    min="0.0001"
                    step="any"
                    value={line.expectedQuantity}
                    onChange={(event) =>
                      updateLine(line.id, { expectedQuantity: event.target.value })
                    }
                  />
                </label>
                <label
                  className="grid gap-1 text-sm"
                  htmlFor={`inbound-line-${line.id}-external-reference`}
                >
                  Tham chiếu dòng ngoài
                  <Input
                    id={`inbound-line-${line.id}-external-reference`}
                    name={`lines[${index}].externalLineReference`}
                    value={line.externalLineReference}
                    onChange={(event) =>
                      updateLine(line.id, { externalLineReference: event.target.value })
                    }
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
              <p className="font-medium">
                {canCreate ? 'Đủ thông tin tạo kế hoạch' : 'Cần bổ sung thông tin bắt buộc'}
              </p>
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
            {mutations.createInboundPlan.isPending ? (
              <Loader2 className="size-4 animate-spin" aria-hidden="true" />
            ) : null}
            Tạo kế hoạch nhập kho
          </Button>
        </div>
      </form>
    </div>
  );
}
