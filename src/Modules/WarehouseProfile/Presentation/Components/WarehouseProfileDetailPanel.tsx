import type { WarehouseProfile } from '@modules/WarehouseProfile/Domain/Entities/WarehouseProfile';
import { WarehouseProfileStatusBadge } from '@modules/WarehouseProfile/Presentation/Components/WarehouseProfileStatusBadge';

interface WarehouseProfileDetailPanelProps {
  profile: WarehouseProfile;
}

function displayValue(value: string | number | null, emptyLabel = '—'): string | number {
  if (value === null) return emptyLabel;
  if (typeof value === 'string' && value.trim() === '') return emptyLabel;
  return value;
}

function scopeValue(value: string | null): string {
  return displayValue(value, 'Tất cả').toString();
}

function Row({ label, value }: { label: string; value: string | number | null }) {
  return (
    <div className="grid grid-cols-[minmax(0,1fr)_minmax(0,2fr)] items-start gap-3 py-1 text-sm">
      <span className="text-muted-foreground min-w-0 break-words">{label}</span>
      <span className="min-w-0 break-words text-right">{displayValue(value)}</span>
    </div>
  );
}

/** Read-only header + six-axis scope + effective window for the selected profile. */
export function WarehouseProfileDetailPanel({ profile }: WarehouseProfileDetailPanelProps) {
  return (
    <div className="space-y-3">
      <div className="flex min-w-0 items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="break-words font-medium">{profile.profileCode}</p>
          <p className="text-muted-foreground break-words text-sm">{profile.profileName}</p>
        </div>
        <span className="shrink-0">
          <WarehouseProfileStatusBadge status={profile.status} />
        </span>
      </div>

      <div className="rounded-md border p-3">
        <Row label="Loại kho" value={profile.warehouseTypeCode} />
        <Row label="Phiên bản" value={profile.version} />
        <Row label="Hiệu lực từ" value={profile.effectiveFrom} />
        <Row label="Hiệu lực đến" value={displayValue(profile.effectiveTo, 'Không giới hạn')} />
      </div>

      <div className="rounded-md border p-3">
        <p className="text-sm font-medium">Phạm vi áp dụng</p>
        <p className="text-muted-foreground mb-2 text-xs">
          Áp dụng cho mọi giá trị khi trường phạm vi là Tất cả.
        </p>
        <Row label="Kho" value={scopeValue(profile.warehouseId)} />
        <Row label="Khu vực" value={scopeValue(profile.zoneId)} />
        <Row label="Loại vị trí" value={scopeValue(profile.locationType)} />
        <Row label="Chủ hàng" value={scopeValue(profile.ownerId)} />
        <Row label="SKU" value={scopeValue(profile.skuId)} />
        <Row label="Nhóm hàng" value={scopeValue(profile.itemClass)} />
        <Row label="Loại đơn" value={scopeValue(profile.orderType)} />
        <Row label="Khách hàng" value={scopeValue(profile.customerId)} />
        <Row label="Nhà cung cấp" value={scopeValue(profile.supplierId)} />
      </div>
    </div>
  );
}
