import { useEffect, useMemo, useState } from 'react';
import type { ChangeEvent, FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Loader2, Plus, Upload, X } from 'lucide-react';

import { ROUTES } from '@app/Config/Routes';
import { Button } from '@shared/Components/Ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '@shared/Components/Ui/Card';
import { downloadBlob } from '@shared/Utils/DownloadBlob';
import { useInboundMutations } from '@modules/Inbound/Application/Commands/UseInboundMutations';
import { InboundPlanLinesEditor } from '@modules/Inbound/Presentation/Components/InboundPlanLinesEditor';
import type { InboundPlanLineDraft } from '@modules/Inbound/Presentation/Components/InboundPlanLinesEditor';
import { InboundPlanScopeFields } from '@modules/Inbound/Presentation/Components/InboundPlanScopeFields';
import { InboundPlanTextFields } from '@modules/Inbound/Presentation/Components/InboundPlanTextFields';
import { useInboundPlanFormLookups } from '@modules/Inbound/Presentation/Components/UseInboundPlanFormLookups';
import type { InboundLineImportPreview } from '@modules/Inbound/Domain/Types/InboundPlan';

let nextDraftLineId = 0;

const initialLine = (): InboundPlanLineDraft => ({
  id: (nextDraftLineId += 1),
  skuId: '',
  uomId: '',
  expectedQuantity: '1',
  externalLineReference: '',
});

export function InboundCreatePage() {
  const navigate = useNavigate();
  const mutations = useInboundMutations();
  const lookups = useInboundPlanFormLookups();
  const [sourceSystem, setSourceSystem] = useState('');
  const [sourceDocumentType, setSourceDocumentType] = useState('ASN');
  const [sourceDocumentNumber, setSourceDocumentNumber] = useState('');
  const [supplierId, setSupplierId] = useState('');
  const [ownerId, setOwnerId] = useState('');
  const [warehouseId, setWarehouseId] = useState('');
  const [warehouseProfileId, setWarehouseProfileId] = useState('');
  const [expectedArrivalAt, setExpectedArrivalAt] = useState('');
  const [lineDrafts, setLineDrafts] = useState<InboundPlanLineDraft[]>(() => [initialLine()]);
  const [excelFile, setExcelFile] = useState<File | null>(null);
  const [excelPreview, setExcelPreview] = useState<InboundLineImportPreview | null>(null);
  const [importOpen, setImportOpen] = useState(false);

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

  function updateLine(id: number, patch: Partial<InboundPlanLineDraft>) {
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

  // Review-fix (IFB-16): typing a new search term can narrow `warehouseOptions` below the
  // already-selected warehouse, and LookupSelect's stale-value fallback then shows its raw id
  // instead of its name. Clearing the selection once the DEBOUNCED search settles (not on every
  // keystroke) keeps the dropdown always showing a real, human-readable choice while avoiding a
  // round-1 regression: clearing on every keystroke re-fired the excelFile/excelPreview reset
  // effect above on every character typed, silently wiping an already-validated import mid-edit.
  useEffect(() => {
    setWarehouseId('');
  }, [lookups.debouncedWarehouseSearch]);

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
          <CardContent>
            <InboundPlanTextFields
              idPrefix="inbound"
              sourceSystem={sourceSystem}
              onSourceSystemChange={setSourceSystem}
              sourceDocumentType={sourceDocumentType}
              onSourceDocumentTypeChange={setSourceDocumentType}
              sourceDocumentNumber={sourceDocumentNumber}
              onSourceDocumentNumberChange={setSourceDocumentNumber}
              expectedArrivalAt={expectedArrivalAt}
              onExpectedArrivalAtChange={setExpectedArrivalAt}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Đối tượng và kho</CardTitle>
          </CardHeader>
          <CardContent>
            <InboundPlanScopeFields
              idPrefix="inbound"
              supplierId={supplierId}
              onSupplierIdChange={setSupplierId}
              ownerId={ownerId}
              onOwnerIdChange={setOwnerId}
              warehouseId={warehouseId}
              onWarehouseIdChange={setWarehouseId}
              warehouseProfileId={warehouseProfileId}
              onWarehouseProfileIdChange={setWarehouseProfileId}
              lookups={lookups}
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
            <InboundPlanLinesEditor
              idPrefix="inbound"
              lines={lineDrafts}
              onUpdateLine={updateLine}
              onRemoveLine={removeLine}
              lookups={lookups}
            />
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
