import { AlertTriangle, Layers3, MapPin, PackageCheck, Warehouse } from 'lucide-react';

import { Badge } from '@shared/Components/Ui/Badge';
import { Button } from '@shared/Components/Ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '@shared/Components/Ui/Card';
import { cn } from '@shared/Utils/Cn';
import type { SiteLocationTree } from '@modules/MasterData/Domain/Types/MasterDataTree';
import { MasterDataStatusBadge } from '@modules/MasterData/Presentation/Components/MasterDataStatusBadge';

interface WarehouseMapPanelProps {
  nodes: SiteLocationTree[];
  selectedNode: SiteLocationTree | null;
  onSelect: (node: SiteLocationTree) => void;
}

interface WarehouseSummary {
  warehouse: SiteLocationTree;
  zones: ZoneSummary[];
}

interface ZoneSummary {
  zone: SiteLocationTree;
  locations: SiteLocationTree[];
  totalLocations: number;
  activeLocations: number;
  inactiveLocations: number;
  blockedLocations: number;
  maintenanceLocations: number;
  capacityQty: number;
}

const HEAT_CLASS = {
  empty: 'border-slate-200 bg-slate-50 text-slate-700',
  low: 'border-rose-200 bg-rose-50 text-rose-900',
  medium: 'border-amber-200 bg-amber-50 text-amber-900',
  high: 'border-emerald-200 bg-emerald-50 text-emerald-900',
} as const;

function flattenWarehouses(nodes: SiteLocationTree[]): SiteLocationTree[] {
  return nodes.flatMap((node) => {
    if (node.type === 'warehouse') return [node];
    return flattenWarehouses(node.children);
  });
}

function containsNode(root: SiteLocationTree, id: string | null): boolean {
  if (!id) return false;
  if (root.id === id) return true;
  return root.children.some((child) => containsNode(child, id));
}

function collectLocations(node: SiteLocationTree): SiteLocationTree[] {
  const direct = node.type === 'location' ? [node] : [];
  return [...direct, ...node.children.flatMap(collectLocations)];
}

function buildWarehouseSummary(nodes: SiteLocationTree[], selectedNode: SiteLocationTree | null): WarehouseSummary | null {
  const warehouses = flattenWarehouses(nodes);
  const selectedWarehouse = resolveSelectedWarehouse(warehouses, selectedNode);
  if (!selectedWarehouse) return null;

  const zones = selectedWarehouse.children
    .filter((child) => child.type === 'zone')
    .map((zone) => {
      const locations = collectLocations(zone);
      const activeLocations = locations.filter((location) => location.status === 'Active').length;
      const inactiveLocations = locations.filter((location) => location.status === 'Inactive').length;
      const blockedLocations = locations.filter((location) => location.status === 'Blocked').length;
      const maintenanceLocations = locations.filter((location) => location.status === 'Maintenance').length;
      const capacityQty = locations.reduce((sum, location) => {
        if (location.type !== 'location') return sum;
        return sum + (Number(location.entity.capacityQty) || 0);
      }, 0);

      return {
        zone,
        locations,
        totalLocations: locations.length,
        activeLocations,
        inactiveLocations,
        blockedLocations,
        maintenanceLocations,
        capacityQty,
      };
    });

  return { warehouse: selectedWarehouse, zones };
}

function resolveSelectedWarehouse(
  warehouses: SiteLocationTree[],
  selectedNode: SiteLocationTree | null,
): SiteLocationTree | null {
  if (!selectedNode) return warehouses[0] ?? null;
  if (selectedNode.type === 'warehouse') return selectedNode;
  if (selectedNode.type === 'site') return flattenWarehouses(selectedNode.children)[0] ?? null;

  return warehouses.find((warehouse) => containsNode(warehouse, selectedNode.id)) ?? warehouses[0] ?? null;
}

function selectedZone(summary: WarehouseSummary, selectedNode: SiteLocationTree | null): ZoneSummary | null {
  return (
    summary.zones.find((zone) => containsNode(zone.zone, selectedNode?.id ?? null)) ??
    summary.zones[0] ??
    null
  );
}

function heatLevel(zone: ZoneSummary): keyof typeof HEAT_CLASS {
  if (zone.totalLocations === 0) return 'empty';
  const activeRatio = zone.activeLocations / zone.totalLocations;
  if (activeRatio >= 0.8) return 'high';
  if (activeRatio >= 0.4) return 'medium';
  return 'low';
}

function formatNumber(value: number): string {
  return new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 2 }).format(value);
}

function locationPreviewForZone(
  zone: ZoneSummary | null,
  selectedNode: SiteLocationTree | null,
): SiteLocationTree[] {
  if (!zone) return [];

  const preview = zone.locations.slice(0, 12);
  const selectedLocation =
    selectedNode?.type === 'location'
      ? zone.locations.find((location) => location.id === selectedNode.id)
      : undefined;

  if (!selectedLocation || preview.some((location) => location.id === selectedLocation.id)) {
    return preview;
  }

  return [...preview.slice(0, 11), selectedLocation];
}

export function WarehouseMapPanel({ nodes, selectedNode, onSelect }: WarehouseMapPanelProps) {
  const summary = buildWarehouseSummary(nodes, selectedNode);

  if (!summary) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Bản đồ kho</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          Chưa có kho để dựng sơ đồ. Tạo site và kho trước khi thêm khu vực hoặc vị trí.
        </CardContent>
      </Card>
    );
  }

  const focusedZone = selectedZone(summary, selectedNode);
  const locationPreview = locationPreviewForZone(focusedZone, selectedNode);
  const totalLocations = summary.zones.reduce((sum, zone) => sum + zone.totalLocations, 0);
  const totalCapacity = summary.zones.reduce((sum, zone) => sum + zone.capacityQty, 0);

  return (
    <Card>
      <CardHeader className="gap-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div className="space-y-1">
            <CardTitle className="flex items-center gap-2 text-base">
              <Warehouse className="size-4" aria-hidden="true" />
              Bản đồ kho và vị trí
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              {summary.warehouse.label} · {summary.zones.length} khu · {totalLocations} vị trí
            </p>
          </div>
          <div className="grid grid-cols-2 gap-2 text-xs sm:grid-cols-3">
            <Metric label="Khu" value={summary.zones.length} />
            <Metric label="Vị trí" value={totalLocations} />
            <Metric label="Sức chứa" value={formatNumber(totalCapacity)} />
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
          <span className="font-medium text-foreground">Chú giải heatmap tồn kho</span>
          <LegendDot className={HEAT_CLASS.high} label="Tồn kho cao" />
          <LegendDot className={HEAT_CLASS.medium} label="Tồn kho trung bình" />
          <LegendDot className={HEAT_CLASS.low} label="Tồn kho thấp" />
          <LegendDot className={HEAT_CLASS.empty} label="Chưa có dữ liệu" />
        </div>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="rounded-lg border border-dashed border-amber-300 bg-amber-50 p-3 text-sm text-amber-950">
          <div className="flex gap-2">
            <AlertTriangle className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
            <p>
              Chưa có lớp dữ liệu tồn kho theo vị trí. Màu hiện là proxy theo trạng thái/cấu hình vị trí, không phải
              số lượng tồn thực tế.
            </p>
          </div>
        </div>

        {summary.zones.length === 0 ? (
          <div className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
            Kho này chưa có khu vực. Tạo khu vực trước khi thêm vị trí hoặc xem heatmap theo khu.
          </div>
        ) : (
          <>
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {summary.zones.map((zone) => {
                const level = heatLevel(zone);
                const selected = focusedZone?.zone.id === zone.zone.id;

                return (
                  <button
                    key={zone.zone.id}
                    type="button"
                    className={cn(
                      'min-h-32 rounded-lg border p-4 text-left shadow-sm transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                      HEAT_CLASS[level],
                      selected && 'ring-2 ring-primary',
                    )}
                    onClick={() => onSelect(zone.zone)}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="truncate text-sm font-semibold">{zone.zone.label}</div>
                        <div className="mt-1 text-xs opacity-80">{zone.zone.type}</div>
                      </div>
                      <MasterDataStatusBadge status={zone.zone.status} />
                    </div>
                    <div className="mt-4 grid grid-cols-2 gap-2 text-xs">
                      <Metric label="Vị trí" value={zone.totalLocations} compact />
                      <Metric label="Hoạt động" value={zone.activeLocations} compact />
                      <Metric label="Không hoạt động" value={zone.inactiveLocations} compact />
                      <Metric label="Bị khóa" value={zone.blockedLocations} compact />
                      <Metric label="Bảo trì" value={zone.maintenanceLocations} compact />
                    </div>
                    <div className="mt-3 flex flex-wrap items-center gap-2 text-xs opacity-80">
                      <span className="inline-flex items-center gap-2">
                        <PackageCheck className="size-4" aria-hidden="true" />
                        Sức chứa {formatNumber(zone.capacityQty)}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>

            <div className="grid gap-4 lg:grid-cols-[260px_1fr]">
              <div className="rounded-lg border p-4">
                <div className="flex items-center gap-2 text-sm font-semibold">
                  <Layers3 className="size-4" aria-hidden="true" />
                  Drilldown khu
                </div>
                <p className="mt-2 text-sm text-muted-foreground">
                  {focusedZone ? focusedZone.zone.label : 'Chọn một khu trên bản đồ để xem vị trí.'}
                </p>
                {focusedZone && (
                  <div className="mt-4 grid grid-cols-2 gap-2 text-xs">
                    <Metric label="Vị trí" value={focusedZone.totalLocations} compact />
                    <Metric label="Sức chứa" value={formatNumber(focusedZone.capacityQty)} compact />
                  </div>
                )}
              </div>

              <div className="rounded-lg border p-4">
                <div className="mb-3 flex items-center justify-between gap-3">
                  <div className="text-sm font-semibold">Vị trí trong khu</div>
                  <Badge variant="outline">
                    {locationPreview.length}/{focusedZone?.totalLocations ?? 0} hiển thị
                  </Badge>
                </div>
                {locationPreview.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Khu này chưa có vị trí con để drilldown.</p>
                ) : (
                  <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
                    {locationPreview.map((location) => (
                      <Button
                        key={location.id}
                        type="button"
                        variant={selectedNode?.id === location.id ? 'secondary' : 'outline'}
                        className="h-auto justify-start gap-2 px-3 py-2 text-left"
                        onClick={() => onSelect(location)}
                      >
                        <MapPin className="size-4 shrink-0" aria-hidden="true" />
                        <span className="min-w-0 flex-1 truncate">{location.label}</span>
                      </Button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}

function Metric({
  label,
  value,
  compact = false,
}: {
  label: string;
  value: string | number;
  compact?: boolean;
}) {
  return (
    <div className={cn('rounded-md border bg-background/70 px-3 py-2', compact && 'px-2 py-1.5')}>
      <div className="text-[11px] font-medium uppercase text-muted-foreground">{label}</div>
      <div className="mt-1 text-sm font-semibold">{value}</div>
    </div>
  );
}

function LegendDot({ className, label }: { className: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className={cn('size-2.5 rounded-full border', className)} aria-hidden="true" />
      {label}
    </span>
  );
}
