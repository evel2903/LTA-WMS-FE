import { useState } from 'react';
import type { FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';

import { ROUTES } from '@app/Config/Routes';
import { Button } from '@shared/Components/Ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '@shared/Components/Ui/Card';
import { Input } from '@shared/Components/Ui/Input';
import { SearchableLookupSelect } from '@shared/Components/Ui/SearchableLookupSelect';
import { useInboundReceivingMutations } from '@modules/InboundReceiving/Application/Commands/UseInboundReceivingMutations';
import { useManualReceiptLookups } from '@modules/InboundReceiving/Presentation/Components/UseManualReceiptLookups';

function newIdempotencyKey() {
  return `manual-receipt-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

export function ManualReceiptCreatePage() {
  const navigate = useNavigate();
  const lookups = useManualReceiptLookups();
  const mutations = useInboundReceivingMutations(null);
  const [ownerId, setOwnerId] = useState('');
  const [warehouseId, setWarehouseId] = useState('');
  const [warehouseProfileId, setWarehouseProfileId] = useState('');
  const [supplierId, setSupplierId] = useState('');
  const [receiptNumber, setReceiptNumber] = useState('');
  const [businessReference, setBusinessReference] = useState('');
  const [sessionKey, setSessionKey] = useState('dock-1');
  const [deviceCode, setDeviceCode] = useState('');
  const [idempotencyKey] = useState(newIdempotencyKey);

  const canSubmit = Boolean(
    ownerId &&
    warehouseId &&
    supplierId &&
    receiptNumber.trim() &&
    businessReference.trim() &&
    sessionKey.trim(),
  );

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!canSubmit || mutations.createManualReceipt.isPending) return;
    mutations.createManualReceipt.mutate(
      {
        ownerId,
        warehouseId,
        warehouseProfileId: warehouseProfileId || null,
        supplierId,
        receiptNumber: receiptNumber.trim(),
        businessReference: businessReference.trim(),
        sessionKey: sessionKey.trim(),
        deviceCode: deviceCode.trim() || null,
        idempotencyKey,
      },
      {
        onSuccess: ({ receipt }) => {
          void navigate(ROUTES.INBOUND_RECEIVING.RECEIPT_DETAIL(receipt.id));
        },
      },
    );
  }

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-4">
      <header className="space-y-1">
        <p className="text-sm text-muted-foreground">Phiếu nhập kho</p>
        <h1 className="text-2xl font-semibold">Tạo phiếu tiếp nhận thủ công</h1>
        <p className="text-sm text-muted-foreground">
          Dùng khi hàng đến mà không có kế hoạch. Phiên tiếp nhận được mở ngay sau khi tạo.
        </p>
      </header>

      <form className="space-y-4" onSubmit={submit}>
        <Card>
          <CardHeader>
            <CardTitle>Chứng từ thực tế</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3 sm:grid-cols-2">
            <label className="grid gap-1 text-sm" htmlFor="manual-receipt-number">
              Số phiếu
              <Input
                id="manual-receipt-number"
                name="receiptNumber"
                value={receiptNumber}
                maxLength={120}
                onChange={(event) => setReceiptNumber(event.target.value)}
              />
            </label>
            <label className="grid gap-1 text-sm" htmlFor="manual-business-reference">
              Tham chiếu nghiệp vụ
              <Input
                id="manual-business-reference"
                name="businessReference"
                value={businessReference}
                maxLength={180}
                onChange={(event) => setBusinessReference(event.target.value)}
              />
            </label>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Đối tượng và kho</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3 sm:grid-cols-2">
            <SearchableLookupSelect
              id="manual-supplier-id"
              name="supplierId"
              label="Nhà cung cấp"
              value={supplierId}
              placeholder="Chọn nhà cung cấp"
              options={lookups.supplierOptions}
              isLoading={lookups.supplierQuery.isLoading}
              isError={lookups.supplierQuery.isError}
              emptyMessage="Chưa có nhà cung cấp đang hoạt động."
              errorMessage="Không tải được nhà cung cấp."
              searchValue={lookups.supplierSearch}
              searchPlaceholder="Tìm theo mã hoặc tên nhà cung cấp..."
              onSearchChange={lookups.setSupplierSearch}
              onChange={setSupplierId}
            />
            <SearchableLookupSelect
              id="manual-owner-id"
              name="ownerId"
              label="Chủ hàng"
              value={ownerId}
              placeholder="Chọn chủ hàng"
              options={lookups.ownerOptions}
              isLoading={lookups.ownerQuery.isLoading}
              isError={lookups.ownerQuery.isError}
              emptyMessage="Chưa có chủ hàng đang hoạt động."
              errorMessage="Không tải được chủ hàng."
              searchValue={lookups.ownerSearch}
              searchPlaceholder="Tìm theo mã hoặc tên chủ hàng..."
              onSearchChange={lookups.setOwnerSearch}
              onChange={setOwnerId}
            />
            <SearchableLookupSelect
              id="manual-warehouse-id"
              name="warehouseId"
              label="Kho"
              value={warehouseId}
              placeholder="Chọn kho"
              options={lookups.warehouseOptions}
              isLoading={lookups.warehouseQuery.isLoading}
              isError={lookups.warehouseQuery.isError}
              emptyMessage="Chưa có kho đang hoạt động."
              errorMessage="Không tải được kho."
              searchValue={lookups.warehouseSearch}
              searchPlaceholder="Tìm theo mã hoặc tên kho..."
              onSearchChange={lookups.setWarehouseSearch}
              onChange={setWarehouseId}
            />
            <SearchableLookupSelect
              id="manual-warehouse-profile-id"
              name="warehouseProfileId"
              label="Hồ sơ kho"
              value={warehouseProfileId}
              placeholder="Không chọn hồ sơ kho"
              options={lookups.warehouseProfileOptions}
              isLoading={lookups.warehouseProfileQuery.isLoading}
              isError={lookups.warehouseProfileQuery.isError}
              emptyMessage="Chưa có hồ sơ kho đang hoạt động."
              errorMessage="Không tải được hồ sơ kho."
              searchValue={lookups.warehouseProfileSearch}
              searchPlaceholder="Tìm theo mã hoặc tên hồ sơ kho..."
              onSearchChange={lookups.setWarehouseProfileSearch}
              optional
              onChange={setWarehouseProfileId}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Phiên tiếp nhận ban đầu</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3 sm:grid-cols-2">
            <label className="grid gap-1 text-sm" htmlFor="manual-session-key">
              Khóa phiên
              <Input
                id="manual-session-key"
                name="sessionKey"
                value={sessionKey}
                maxLength={120}
                onChange={(event) => setSessionKey(event.target.value)}
              />
            </label>
            <label className="grid gap-1 text-sm" htmlFor="manual-device-code">
              Thiết bị (không bắt buộc)
              <Input
                id="manual-device-code"
                name="deviceCode"
                value={deviceCode}
                maxLength={80}
                onChange={(event) => setDeviceCode(event.target.value)}
              />
            </label>
            <details className="sm:col-span-2 rounded-md border bg-muted/30 p-3 text-sm">
              <summary className="cursor-pointer font-medium">Chi tiết kỹ thuật</summary>
              <p className="mt-2 break-all text-muted-foreground">Idempotency: {idempotencyKey}</p>
            </details>
          </CardContent>
        </Card>

        {mutations.createManualReceipt.error ? (
          <p role="alert" className="text-sm text-destructive">
            Không thể tạo phiếu nhập kho. Vui lòng kiểm tra dữ liệu và thử lại.
          </p>
        ) : null}

        <div className="flex flex-wrap justify-end gap-2">
          <Button asChild type="button" variant="secondary">
            <Link to={ROUTES.INBOUND_RECEIVING.ROOT}>Hủy</Link>
          </Button>
          <Button type="submit" disabled={!canSubmit || mutations.createManualReceipt.isPending}>
            {mutations.createManualReceipt.isPending ? 'Đang tạo...' : 'Tạo và tiếp nhận ngay'}
          </Button>
        </div>
      </form>
    </div>
  );
}
