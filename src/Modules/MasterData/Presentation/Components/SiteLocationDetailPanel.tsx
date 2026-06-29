import { Alert, AlertDescription, AlertTitle } from '@shared/Components/Reui/alert';
import { Card, CardContent, CardHeader, CardTitle } from '@shared/Components/Ui/Card';
import type { LocationProfile } from '@modules/MasterData/Domain/Types/MasterDataEntities';
import type { SiteLocationTree } from '@modules/MasterData/Domain/Types/MasterDataTree';
import { LocationProfileConstraintsPanel } from '@modules/MasterData/Presentation/Components/LocationProfileConstraintsPanel';
import { MasterDataStatusBadge } from '@modules/MasterData/Presentation/Components/MasterDataStatusBadge';

function DetailRow({ label, value }: { label: string; value: string | number | boolean | null | undefined }) {
  return (
    <div className="grid grid-cols-3 gap-3 text-sm">
      <div className="text-muted-foreground">{label}</div>
      <div className="col-span-2 break-words">{value === null || value === undefined ? '-' : String(value)}</div>
    </div>
  );
}

function renderEntityDetails(node: SiteLocationTree) {
  switch (node.type) {
    case 'site':
      return (
        <>
          <DetailRow label="Code" value={node.entity.siteCode} />
          <DetailRow label="Name" value={node.entity.siteName} />
        </>
      );
    case 'warehouse':
      return (
        <>
          <DetailRow label="Code" value={node.entity.warehouseCode} />
          <DetailRow label="Name" value={node.entity.warehouseName} />
          <DetailRow label="Type" value={node.entity.warehouseTypeCode} />
        </>
      );
    case 'zone':
      return (
        <>
          <DetailRow label="Code" value={node.entity.zoneCode} />
          <DetailRow label="Name" value={node.entity.zoneName} />
          <DetailRow label="Type" value={node.entity.zoneType} />
        </>
      );
    case 'location':
      return (
        <>
          <DetailRow label="Code" value={node.entity.locationCode} />
          <DetailRow label="Name" value={node.entity.locationName} />
          <DetailRow label="Type" value={node.entity.locationType} />
          <DetailRow label="Profile" value={node.entity.locationProfileId} />
          <DetailRow label="Sức chứa" value={node.entity.capacityQty} />
          <DetailRow label="Trộn SKU" value={node.entity.mixSkuPolicy} />
        </>
      );
    default:
      return null;
  }
}

interface SiteLocationDetailPanelProps {
  selectedNode: SiteLocationTree | null;
  locationProfiles: LocationProfile[];
  canEdit: boolean;
}

export function SiteLocationDetailPanel({
  selectedNode,
  locationProfiles,
  canEdit,
}: SiteLocationDetailPanelProps) {
  if (!selectedNode) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Chi tiết</CardTitle>
        </CardHeader>
        <CardContent>
          <Alert role="status" variant="info">
            <AlertDescription>Chọn site, kho, khu vực hoặc vị trí để xem chi tiết.</AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  const profile =
    selectedNode.type === 'location'
      ? locationProfiles.find((item) => item.id === selectedNode.entity.locationProfileId) ?? null
      : null;

  return (
    <Card>
      <CardHeader className="flex-row items-start justify-between gap-3">
        <div>
          <CardTitle className="text-base">{selectedNode.label}</CardTitle>
          <div className="text-muted-foreground mt-1 text-xs uppercase">{selectedNode.type}</div>
        </div>
        <div className="flex items-center gap-2">
          {!canEdit && <span className="text-muted-foreground text-xs font-medium">Chỉ đọc</span>}
          <MasterDataStatusBadge status={selectedNode.status} />
        </div>
      </CardHeader>
      <CardContent className="space-y-5">
        {!canEdit && (
          <Alert role="status" variant="warning">
            <AlertTitle>Chỉ đọc</AlertTitle>
            <AlertDescription>Bạn chỉ có quyền xem cấu hình này.</AlertDescription>
          </Alert>
        )}
        <div className="space-y-2">
          <DetailRow label="ID" value={selectedNode.entity.id} />
          {renderEntityDetails(selectedNode)}
          <DetailRow label="Cập nhật lúc" value={selectedNode.entity.updatedAt} />
        </div>

        {selectedNode.type === 'location' && (
          <section className="space-y-3">
            <h2 className="text-sm font-semibold">Hồ sơ / Ràng buộc</h2>
            <LocationProfileConstraintsPanel
              profile={profile}
              profileId={selectedNode.entity.locationProfileId}
            />
          </section>
        )}
      </CardContent>
    </Card>
  );
}
