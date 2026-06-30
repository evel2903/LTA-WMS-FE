import { Layers3, MapPin, Warehouse } from 'lucide-react';

import { Alert, AlertDescription } from '@shared/Components/Reui/alert';
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
  warehouses: SiteLocationTree[];
  zones: ZoneSummary[];
}

interface ZoneSummary {
  zone: SiteLocationTree;
  locations: SiteLocationTree[];
  totalLocations: number;
  capacityQty: number;
}

interface AisleSummary {
  code: string;
  floors: FloorSummary[];
}

interface FloorSummary {
  code: string;
  locations: SiteLocationTree[];
}

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

function collectPhysicalSlots(node: SiteLocationTree): SiteLocationTree[] {
  if (node.type === 'location' && node.children.length === 0) return [node];
  return node.children.flatMap(collectPhysicalSlots);
}

function buildWarehouseSummary(nodes: SiteLocationTree[], selectedNode: SiteLocationTree | null): WarehouseSummary | null {
  const warehouses = flattenWarehouses(nodes);
  const selectedWarehouse = resolveSelectedWarehouse(warehouses, selectedNode);
  if (!selectedWarehouse) return null;

  const zones = selectedWarehouse.children
    .filter((child) => child.type === 'zone')
    .map((zone) => {
      const locations = collectPhysicalSlots(zone);
      const capacityQty = locations.reduce((sum, location) => {
        if (location.type !== 'location') return sum;
        return sum + (Number(location.entity.capacityQty) || 0);
      }, 0);

      return {
        zone,
        locations,
        totalLocations: locations.length,
        capacityQty,
      };
    });

  return { warehouse: selectedWarehouse, warehouses, zones };
}

function resolveSelectedWarehouse(
  warehouses: SiteLocationTree[],
  selectedNode: SiteLocationTree | null,
): SiteLocationTree | null {
  if (!selectedNode) return preferredWarehouse(warehouses);
  if (selectedNode.type === 'warehouse') return selectedNode;
  if (selectedNode.type === 'site') {
    return preferredWarehouse(flattenWarehouses(selectedNode.children));
  }

  return warehouses.find((warehouse) => containsNode(warehouse, selectedNode.id)) ?? preferredWarehouse(warehouses);
}

function preferredWarehouse(warehouses: SiteLocationTree[]): SiteLocationTree | null {
  return warehouses.find(hasPhysicalStructure) ?? warehouses[0] ?? null;
}

function hasPhysicalStructure(warehouse: SiteLocationTree): boolean {
  return warehouse.children.some((child) => child.type === 'zone');
}

function selectedZone(summary: WarehouseSummary, selectedNode: SiteLocationTree | null): ZoneSummary | null {
  return (
    summary.zones.find((zone) => containsNode(zone.zone, selectedNode?.id ?? null)) ??
    summary.zones[0] ??
    null
  );
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

function buildAisles(zone: ZoneSummary | null): AisleSummary[] {
  if (!zone) return [];

  const grouped = new Map<string, Map<string, SiteLocationTree[]>>();
  zone.locations.forEach((location, index) => {
    const code = aisleCode(location, index);
    const floor = floorCode(location);
    const aisle = grouped.get(code) ?? new Map<string, SiteLocationTree[]>();
    aisle.set(floor, [...(aisle.get(floor) ?? []), location]);
    grouped.set(code, aisle);
  });

  return [...grouped.entries()]
    .sort(([left], [right]) => left.localeCompare(right, 'vi'))
    .map(([code, floors]) => ({
      code,
      floors: [...floors.entries()]
        .sort(([left], [right]) => left.localeCompare(right, 'vi'))
        .map(([floorCodeValue, locations]) => ({
          code: floorCodeValue,
          locations: [...locations].sort((left, right) => baySortValue(left) - baySortValue(right)),
        })),
    }));
}

function zoneCode(zone: ZoneSummary): string {
  if (zone.zone.type === 'zone') return zone.zone.entity.zoneCode;
  return zone.zone.label.split(' - ')[0] ?? zone.zone.label;
}

function zoneName(zone: ZoneSummary): string {
  if (zone.zone.type === 'zone') return zone.zone.entity.zoneName;
  return zone.zone.label;
}

function zoneType(zone: ZoneSummary): string {
  if (zone.zone.type === 'zone') return zone.zone.entity.zoneType;
  return zone.zone.type;
}

function locationCode(location: SiteLocationTree): string {
  if (location.type === 'location') return location.entity.locationCode;
  return location.label.split(' - ')[0] ?? location.label;
}

function locationType(location: SiteLocationTree): string {
  if (location.type === 'location') return location.entity.locationType;
  return location.type;
}

function aisleCode(location: SiteLocationTree, index: number): string {
  const parts = physicalNumericParts(locationCode(location));
  return String(parts[0] ?? Math.floor(index / 12) + 1).padStart(2, '0');
}

function baySortValue(location: SiteLocationTree): number {
  const parts = physicalNumericParts(locationCode(location));
  return parts[1] ?? locationOrder(location);
}

function floorCode(location: SiteLocationTree): string {
  const parts = physicalNumericParts(locationCode(location));
  return String(parts[2] ?? 1).padStart(2, '0');
}

function physicalNumericParts(code: string): number[] {
  return (code.match(/\d+/g) ?? []).map((part) => Number(part)).filter(Number.isFinite);
}

function locationOrder(location: SiteLocationTree): number {
  if (location.type !== 'location') return 0;
  return location.entity.pickSequence ?? location.entity.putawaySequence ?? 0;
}

function warehouseCounts(warehouse: SiteLocationTree): { zones: number; locations: number } {
  return {
    zones: warehouse.children.filter((child) => child.type === 'zone').length,
    locations: collectPhysicalSlots(warehouse).length,
  };
}

function formatNumber(value: number): string {
  return new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 2 }).format(value);
}

function statusDotClass(status: SiteLocationTree['status']): string {
  if (status === 'Active') return 'bg-emerald-500';
  if (status === 'Inactive') return 'bg-slate-300';
  if (status === 'Blocked') return 'bg-amber-500';
  if (status === 'Maintenance') return 'bg-sky-500';
  return 'bg-slate-300';
}

function zoneCellClass(zone: ZoneSummary, selected: boolean): string {
  const base = 'border-slate-200 bg-slate-50 text-slate-900';
  const status =
    zone.zone.status === 'Active'
      ? 'hover:border-emerald-300 hover:bg-emerald-50'
      : zone.zone.status === 'Blocked'
        ? 'border-amber-200 bg-amber-50 text-amber-950'
        : zone.zone.status === 'Inactive'
          ? 'bg-slate-100 text-slate-600'
          : 'border-sky-200 bg-sky-50 text-sky-950';

  return cn(base, status, selected && 'border-primary bg-primary/5 ring-2 ring-primary');
}

function locationCellClass(location: SiteLocationTree, selected: boolean): string {
  const status =
    location.status === 'Active'
      ? 'border-emerald-200 bg-emerald-100 hover:bg-emerald-200'
      : location.status === 'Blocked'
        ? 'border-amber-200 bg-amber-100 hover:bg-amber-200'
        : location.status === 'Inactive'
          ? 'border-slate-200 bg-slate-200 hover:bg-slate-300'
          : 'border-sky-200 bg-sky-100 hover:bg-sky-200';

  return cn(
    'size-4 rounded-[3px] border transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
    status,
    selected && 'ring-2 ring-primary ring-offset-1',
  );
}

export function WarehouseMapPanel({ nodes, selectedNode, onSelect }: WarehouseMapPanelProps) {
  const summary = buildWarehouseSummary(nodes, selectedNode);

  if (!summary) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Sơ đồ kho</CardTitle>
        </CardHeader>
        <CardContent>
          <Alert role="status" variant="info">
            <AlertDescription>
              Chưa có kho để dựng sơ đồ. Tạo site và kho trước khi thêm khu vực hoặc vị trí.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  const focusedZone = selectedZone(summary, selectedNode);
  const locationPreview = locationPreviewForZone(focusedZone, selectedNode);
  const aisleRows = buildAisles(focusedZone);
  const totalLocations = summary.zones.reduce((sum, zone) => sum + zone.totalLocations, 0);
  const totalCapacity = summary.zones.reduce((sum, zone) => sum + zone.capacityQty, 0);
  const maxBays = Math.max(...aisleRows.flatMap((aisle) => aisle.floors.map((floor) => floor.locations.length)), 0);
  const floorCount = new Set(aisleRows.flatMap((aisle) => aisle.floors.map((floor) => floor.code))).size;
  const zoneSlots = focusedZone?.totalLocations ?? 0;

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="gap-4">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
            <div className="space-y-1">
              <CardTitle className="flex items-center gap-2 text-base">
                <Warehouse className="size-4" aria-hidden="true" />
                Sơ đồ kho tổng
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                {summary.warehouse.label} · {summary.zones.length} khu · {totalLocations} vị trí
              </p>
            </div>
            <Button
              type="button"
              variant={selectedNode?.id === summary.warehouse.id ? 'secondary' : 'outline'}
              className="w-fit"
              onClick={() => onSelect(summary.warehouse)}
            >
              Chọn kho
            </Button>
            <div className="grid grid-cols-2 gap-2 text-xs sm:grid-cols-3">
              <Metric label="Khu" value={summary.zones.length} />
              <Metric label="Vị trí" value={totalLocations} />
              <Metric label="Sức chứa vật lý" value={formatNumber(totalCapacity)} />
            </div>
          </div>
          <div className="text-xs text-muted-foreground">Bấm khu để xem chi tiết dãy · kệ · tầng.</div>
        </CardHeader>
        <CardContent className="space-y-4">
          {summary.warehouses.length > 1 && (
            <label className="grid gap-1 text-sm">
              <span className="text-xs font-medium uppercase text-muted-foreground">Kho</span>
              <select
                className="h-10 w-full rounded-md border bg-background px-3 text-sm"
                value={summary.warehouse.id}
                onChange={(event) => {
                  const warehouse = summary.warehouses.find((item) => item.id === event.target.value);
                  if (warehouse) onSelect(warehouse);
                }}
              >
                {summary.warehouses.map((warehouse) => {
                  const counts = warehouseCounts(warehouse);
                  return (
                    <option key={warehouse.id} value={warehouse.id}>
                      {warehouse.label} · {counts.zones} khu · {counts.locations} vị trí
                    </option>
                  );
                })}
              </select>
            </label>
          )}

          {summary.zones.length === 0 ? (
            <Alert role="status" variant="info">
              <AlertDescription>
                Kho này chưa có khu vực. Tạo khu vực trước khi thêm vị trí hoặc xem sơ đồ cấu trúc kho.
              </AlertDescription>
            </Alert>
          ) : (
            <>
              <div className="grid auto-rows-[88px] grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-6 2xl:grid-cols-12">
                {summary.zones.map((zone) => {
                  const selected = focusedZone?.zone.id === zone.zone.id;

                  return (
                    <button
                      key={zone.zone.id}
                      type="button"
                      aria-label={zone.zone.label}
                      className={cn(
                        'flex flex-col justify-between rounded-lg border p-3 text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                        zoneCellClass(zone, selected),
                      )}
                      onClick={() => onSelect(zone.zone)}
                    >
                      <span className="flex items-start justify-between gap-2">
                        <span className="text-sm font-extrabold">{zoneCode(zone)}</span>
                        <span className={cn('mt-1 size-2.5 rounded-full', statusDotClass(zone.zone.status))} />
                      </span>
                      <span className="min-w-0">
                        <span className="block truncate text-xs font-medium">{zoneName(zone)}</span>
                        <span className="mt-1 block text-[10px] text-muted-foreground">
                          {zone.totalLocations} vị trí · {zoneType(zone)}
                        </span>
                      </span>
                    </button>
                  );
                })}
              </div>

              <div className="flex flex-wrap gap-4 text-xs text-muted-foreground">
                <LegendDot className="bg-emerald-500" label="Hoạt động" />
                <LegendDot className="bg-slate-300" label="Không hoạt động" />
                <LegendDot className="bg-amber-500" label="Bị khóa" />
                <LegendDot className="bg-sky-500" label="Bảo trì" />
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {focusedZone && (
        <div className="grid gap-4 xl:grid-cols-[minmax(0,1.6fr)_minmax(300px,0.9fr)]">
          <Card>
            <CardHeader className="gap-3">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <span className="flex size-8 items-center justify-center rounded-md bg-foreground text-sm font-extrabold text-background">
                      {zoneCode(focusedZone).replace(/^ZONE[-_]?/i, '').slice(0, 3)}
                    </span>
                    Khu {zoneCode(focusedZone)} · {zoneName(focusedZone)}
                  </CardTitle>
                  <p className="mt-2 text-sm text-muted-foreground">
                    {aisleRows.length} dãy × {maxBays} kệ/dãy × {floorCount} tầng · {zoneSlots} ô vị trí
                  </p>
                </div>
                <MasterDataStatusBadge status={focusedZone.zone.status} />
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {aisleRows.length === 0 ? (
                <Alert role="status" variant="info">
                  <AlertDescription>Khu này chưa có vị trí con để dựng sơ đồ chi tiết.</AlertDescription>
                </Alert>
              ) : (
                <>
                  <div className="space-y-2 overflow-x-auto">
                    {aisleRows.map((aisle) => (
                      <div key={aisle.code} className="min-w-max space-y-1">
                        {aisle.floors.map((floor) => (
                          <div key={`${aisle.code}-${floor.code}`} className="flex items-center gap-3">
                            <span className="w-28 shrink-0 text-xs font-bold text-muted-foreground tabular-nums">
                              Dãy {aisle.code} · Tầng {floor.code}
                            </span>
                            <div className="flex flex-wrap items-center gap-1">
                              {floor.locations.map((location) => (
                                <button
                                  key={location.id}
                                  type="button"
                                  className={locationCellClass(location, selectedNode?.id === location.id)}
                                  aria-label={`Ô sơ đồ ${locationCode(location)}`}
                                  title={location.label}
                                  onClick={() => onSelect(location)}
                                />
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    ))}
                  </div>

                  <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
                    <LegendDot className="bg-emerald-500" label="Vị trí hoạt động" />
                    <LegendDot className="bg-amber-500" label="Bị khóa" />
                    <LegendDot className="bg-sky-500" label="Bảo trì" />
                    <span className="ml-auto text-[11px] text-muted-foreground">
                      Mỗi ô = 1 vị trí vật lý · mã khu-dãy-kệ · ví dụ {zoneCode(focusedZone)}-01-01
                    </span>
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Layers3 className="size-4" aria-hidden="true" />
                    Vị trí trong khu
                  </CardTitle>
                  <p className="mt-2 text-sm text-muted-foreground">
                    Chọn vị trí để xem cấu hình chi tiết phía dưới.
                  </p>
                </div>
                <Badge variant="outline">
                  {locationPreview.length}/{focusedZone.totalLocations} hiển thị
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              {locationPreview.length === 0 ? (
                <Alert role="status" variant="info">
                  <AlertDescription>Khu này chưa có vị trí con để xem chi tiết.</AlertDescription>
                </Alert>
              ) : (
                <div className="grid gap-2">
                  {locationPreview.map((location) => (
                    <Button
                      key={location.id}
                      type="button"
                      variant={selectedNode?.id === location.id ? 'secondary' : 'outline'}
                      className="h-auto justify-start gap-3 px-3 py-2 text-left"
                      onClick={() => onSelect(location)}
                    >
                      <MapPin className="size-4 shrink-0" aria-hidden="true" />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm">{location.label}</span>
                        <span className="mt-0.5 block text-xs text-muted-foreground">
                          {locationType(location)} · thứ tự {locationOrder(location) || '-'}
                        </span>
                      </span>
                    </Button>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
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
      <span className={cn('size-2.5 rounded-[3px]', className)} aria-hidden="true" />
      {label}
    </span>
  );
}
