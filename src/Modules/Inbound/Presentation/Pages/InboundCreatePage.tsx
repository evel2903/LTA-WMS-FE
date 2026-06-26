import { useMemo, useState } from 'react';
import type { FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Loader2, Plus, Trash2 } from 'lucide-react';

import { ROUTES } from '@app/Config/Routes';
import { Button } from '@shared/Components/Ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '@shared/Components/Ui/Card';
import { Input } from '@shared/Components/Ui/Input';
import { useInboundMutations } from '@modules/Inbound/Application/Commands/UseInboundMutations';
import { useActiveOwners } from '@modules/MasterData/Application/Queries/CatalogQueries';
import { useActiveWarehouses } from '@modules/MasterData/Application/Queries/UseSiteLocationTree';
import { usePartners } from '@modules/PartnerMaster/Application/Queries/UsePartners';
import { useWarehouseProfiles } from '@modules/WarehouseProfile/Application/Queries/UseWarehouseProfiles';

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
  const [sourceSystem, setSourceSystem] = useState('');
  const [sourceDocumentType, setSourceDocumentType] = useState('ASN');
  const [sourceDocumentNumber, setSourceDocumentNumber] = useState('');
  const [supplierId, setSupplierId] = useState('');
  const [ownerId, setOwnerId] = useState('');
  const [warehouseId, setWarehouseId] = useState('');
  const [warehouseProfileId, setWarehouseProfileId] = useState('');
  const [expectedArrivalAt, setExpectedArrivalAt] = useState('');
  const [lineDrafts, setLineDrafts] = useState<DraftLine[]>(() => [initialLine()]);

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

  function updateLine(id: number, patch: Partial<DraftLine>) {
    setLineDrafts((lines) => lines.map((line) => (line.id === id ? { ...line, ...patch } : line)));
  }

  function removeLine(id: number) {
    setLineDrafts((lines) => (lines.length === 1 ? lines : lines.filter((line) => line.id !== id)));
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
            {lineDrafts.map((line, index) => (
              <div key={line.id} className="grid gap-3 rounded-md border p-3 lg:grid-cols-[1fr_1fr_1fr_1fr_auto]">
                <label className="grid gap-1 text-sm" htmlFor={`inbound-line-${line.id}-sku-id`}>
                  ID SKU
                  <Input
                    id={`inbound-line-${line.id}-sku-id`}
                    name={`lines[${index}].skuId`}
                    value={line.skuId}
                    onChange={(event) => updateLine(line.id, { skuId: event.target.value })}
                    placeholder="sku-1"
                  />
                </label>
                <label className="grid gap-1 text-sm" htmlFor={`inbound-line-${line.id}-uom-id`}>
                  ID đơn vị tính
                  <Input
                    id={`inbound-line-${line.id}-uom-id`}
                    name={`lines[${index}].uomId`}
                    value={line.uomId}
                    onChange={(event) => updateLine(line.id, { uomId: event.target.value })}
                    placeholder="uom-1"
                  />
                </label>
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
