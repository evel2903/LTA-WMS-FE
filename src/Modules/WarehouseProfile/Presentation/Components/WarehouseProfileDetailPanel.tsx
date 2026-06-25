import type { WarehouseProfile } from '@modules/WarehouseProfile/Domain/Entities/WarehouseProfile';
import { WarehouseProfileStatusBadge } from '@modules/WarehouseProfile/Presentation/Components/WarehouseProfileStatusBadge';

interface WarehouseProfileDetailPanelProps {
  profile: WarehouseProfile;
}

function Row({ label, value }: { label: string; value: string | number | null }) {
  return (
    <div className="flex justify-between gap-4 py-1 text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className="text-right">{value === null || value === '' ? '—' : value}</span>
    </div>
  );
}

/** Read-only header + six-axis scope + effective window for the selected profile. */
export function WarehouseProfileDetailPanel({ profile }: WarehouseProfileDetailPanelProps) {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <p className="font-medium">{profile.profileCode}</p>
          <p className="text-muted-foreground text-sm">{profile.profileName}</p>
        </div>
        <WarehouseProfileStatusBadge status={profile.status} />
      </div>

      <div className="rounded-md border p-3">
        <Row label="Loại kho" value={profile.warehouseTypeCode} />
        <Row label="Phiên bản" value={profile.version} />
        <Row label="Hiệu lực từ" value={profile.effectiveFrom} />
        <Row label="Hiệu lực đến" value={profile.effectiveTo} />
      </div>

      <div className="rounded-md border p-3">
        <p className="text-muted-foreground mb-1 text-xs">Scope (null = wildcard)</p>
        <Row label="Kho" value={profile.warehouseId} />
        <Row label="Khu vực" value={profile.zoneId} />
        <Row label="Loại vị trí" value={profile.locationType} />
        <Row label="Chủ hàng" value={profile.ownerId} />
        <Row label="SKU" value={profile.skuId} />
        <Row label="Nhóm hàng" value={profile.itemClass} />
        <Row label="Loại đơn" value={profile.orderType} />
        <Row label="Khách hàng" value={profile.customerId} />
        <Row label="Nhà cung cấp" value={profile.supplierId} />
      </div>
    </div>
  );
}
