import { useId, useMemo, useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';

import { ROUTES } from '@app/Config/Routes';
import { DetailPageShell, type PageBoundaryState } from '@shared/Components/Page';
import { Alert, AlertDescription, AlertTitle } from '@shared/Components/Reui/alert';
import { Badge } from '@shared/Components/Ui/Badge';
import { Button } from '@shared/Components/Ui/Button';
import { Card, CardContent } from '@shared/Components/Ui/Card';
import { Input } from '@shared/Components/Ui/Input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@shared/Components/Ui/Table';
import type { LocationProfile } from '@modules/MasterData/Domain/Types/MasterDataTree';
import type { SiteLocationTree } from '@modules/MasterData/Domain/Types/MasterDataTree';
import { SiteLocationDetailPanel } from '@modules/MasterData/Presentation/Components/SiteLocationDetailPanel';
import { masterDataStatusVariant } from '@modules/MasterData/Presentation/Components/MasterDataStatusVariant';
import { WarehouseMapPanel } from '@modules/MasterData/Presentation/Components/WarehouseMapPanel';

export type SiteLocationTreePageMode = 'master' | 'detail';
export type SiteLocationTreePageState = 'loading' | 'empty' | 'ready' | 'error' | 'denied' | 'not-found';
type DeferredPanel = ReactNode | ((onComplete: () => void) => ReactNode);

interface SiteLocationTreePageViewProps {
  mode?: SiteLocationTreePageMode;
  state: SiteLocationTreePageState;
  nodes: SiteLocationTree[];
  selectedNode: SiteLocationTree | null;
  locationProfiles: LocationProfile[];
  canCreate: boolean;
  canEdit: boolean;
  errorMessage?: string;
  formPanel?: ReactNode;
  createSitePanel?: DeferredPanel;
  createWarehousePanel?: DeferredPanel;
  onSelect: (node: SiteLocationTree) => void;
}

type SiteNode = Extract<SiteLocationTree, { type: 'site' }>;
type WarehouseNode = Extract<SiteLocationTree, { type: 'warehouse' }>;

interface WarehouseListRow {
  site: SiteNode;
  warehouse: WarehouseNode;
  zoneCount: number;
  locationCount: number;
}

function countDescendants(node: SiteLocationTree, type: SiteLocationTree['type']): number {
  return node.children.reduce((total, child) => {
    const own = child.type === type ? 1 : 0;
    return total + own + countDescendants(child, type);
  }, 0);
}

function collectWarehouseRows(nodes: SiteLocationTree[]): WarehouseListRow[] {
  return nodes.flatMap((node) => {
    if (node.type !== 'site') return [];

    return node.children
      .filter((child): child is WarehouseNode => child.type === 'warehouse')
      .map((warehouse) => ({
        site: node,
        warehouse,
        zoneCount: countDescendants(warehouse, 'zone'),
        locationCount: countDescendants(warehouse, 'location'),
      }));
  });
}

function statusLabel(status: string): string {
  switch (status) {
    case 'Active':
      return 'Đang hoạt động';
    case 'Inactive':
      return 'Không hoạt động';
    case 'Blocked':
      return 'Bị khóa';
    case 'Maintenance':
      return 'Bảo trì';
    default:
      return status;
  }
}

function renderDeferredPanel(panel: DeferredPanel | undefined, onComplete: () => void): ReactNode {
  return typeof panel === 'function' ? panel(onComplete) : panel;
}

function toDetailPageState(state: SiteLocationTreePageState): PageBoundaryState | null {
  switch (state) {
    case 'loading':
      return 'loading';
    case 'error':
      return 'error';
    case 'denied':
      return 'forbidden';
    case 'not-found':
      return 'notFound';
    case 'empty':
      return 'empty';
    case 'ready':
      return null;
    default:
      return null;
  }
}

function detailStateCopy(
  state: SiteLocationTreePageState,
  errorMessage?: string,
): { title?: string; message?: string } {
  switch (state) {
    case 'loading':
      return {
        title: 'Đang tải sơ đồ site và vị trí',
        message: 'Màn hình đang tải cấu trúc vật lý của kho đang chọn.',
      };
    case 'error':
      return {
        title: 'Không thể tải sơ đồ site và vị trí',
        message: errorMessage ?? 'Đã xảy ra lỗi API không mong muốn.',
      };
    case 'denied':
      return {
        title: 'Không có quyền',
        message: 'Bạn không có quyền đọc sơ đồ site và vị trí trong phạm vi này.',
      };
    case 'not-found':
      return {
        title: 'Không tìm thấy kho',
        message: 'Kho trong đường dẫn không còn tồn tại hoặc bạn không có quyền xem cấu trúc vật lý của kho này.',
      };
    case 'empty':
      return {
        title: 'Chưa có cấu trúc kho',
        message: 'Tạo site và kho ở danh sách kho trước khi mở sơ đồ cấu trúc vật lý.',
      };
    default:
      return {};
  }
}

export function SiteLocationTreePageView({
  mode = 'detail',
  state,
  nodes,
  selectedNode,
  locationProfiles,
  canCreate,
  canEdit,
  errorMessage,
  formPanel,
  createSitePanel,
  createWarehousePanel,
  onSelect,
}: SiteLocationTreePageViewProps) {
  const [siteModalOpen, setSiteModalOpen] = useState(false);
  const [warehouseModalOpen, setWarehouseModalOpen] = useState(false);

  if (mode === 'detail' && state !== 'ready') {
    const detailState = toDetailPageState(state);
    const { title, message } = detailStateCopy(state, errorMessage);

    return (
      <DetailPageShell
        title="Sơ đồ cấu trúc kho"
        subtitle="Xem khu vực và vị trí vật lý của kho đang chọn."
        backTo={ROUTES.FOUNDATION.LOCATIONS}
        backLabel="Quay lại danh sách kho"
        contentAriaLabel="Sơ đồ cấu trúc kho chi tiết"
        state={detailState}
        stateTitle={title}
        stateMessage={message}
        stateAction={
          state === 'empty' ? (
            <Button asChild variant="outline">
              <Link to={ROUTES.FOUNDATION.LOCATIONS}>Về danh sách kho</Link>
            </Button>
          ) : undefined
        }
      />
    );
  }

  if (state === 'denied') {
    return (
      <div className="space-y-6">
        <PageHeader
          mode={mode}
          canCreate={canCreate}
          onCreateSite={() => setSiteModalOpen(true)}
          onCreateWarehouse={() => setWarehouseModalOpen(true)}
        />
        <Alert role="status" variant="warning">
          <AlertTitle>Không có quyền</AlertTitle>
          <AlertDescription>
            Bạn không có quyền đọc sơ đồ site và vị trí trong phạm vi này.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  if (state === 'loading') {
    return (
      <div className="space-y-6">
        <PageHeader
          mode={mode}
          canCreate={canCreate}
          onCreateSite={() => setSiteModalOpen(true)}
          onCreateWarehouse={() => setWarehouseModalOpen(true)}
        />
        <Card>
          <CardContent className="py-10 text-sm text-muted-foreground">
            {mode === 'master'
              ? 'Đang tải danh sách kho...'
              : 'Đang tải sơ đồ site và vị trí...'}
          </CardContent>
        </Card>
      </div>
    );
  }

  if (state === 'error') {
    return (
      <div className="space-y-6">
        <PageHeader
          mode={mode}
          canCreate={canCreate}
          onCreateSite={() => setSiteModalOpen(true)}
          onCreateWarehouse={() => setWarehouseModalOpen(true)}
        />
        <Alert variant="destructive">
          <AlertTitle>
            {mode === 'master' ? 'Không thể tải danh sách kho' : 'Không thể tải sơ đồ site và vị trí'}
          </AlertTitle>
          <AlertDescription>{errorMessage ?? 'Đã xảy ra lỗi API không mong muốn.'}</AlertDescription>
        </Alert>
      </div>
    );
  }

  if (state === 'not-found') {
    return (
      <div className="space-y-6">
        <PageHeader
          mode="detail"
          canCreate={canCreate}
          onCreateSite={() => setSiteModalOpen(true)}
          onCreateWarehouse={() => setWarehouseModalOpen(true)}
        />
        <Alert role="status" variant="warning">
          <AlertTitle>Không tìm thấy kho</AlertTitle>
          <AlertDescription>
            Kho trong đường dẫn không còn tồn tại hoặc bạn không có quyền xem cấu trúc vật lý của kho này.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  if (state === 'empty') {
    return (
      <div className="space-y-6">
        <PageHeader
          mode={mode}
          canCreate={canCreate}
          onCreateSite={() => setSiteModalOpen(true)}
          onCreateWarehouse={() => setWarehouseModalOpen(true)}
        />
        <div className="space-y-4">
          <Alert role="status" variant="info">
            <AlertTitle>Chưa có site</AlertTitle>
            <AlertDescription>
              Tạo site đầu tiên trước khi thêm kho, khu vực và vị trí.
            </AlertDescription>
          </Alert>
          {canCreate ? (
            (formPanel ?? (
              <Alert role="status" variant="info">
                <AlertDescription>Dùng biểu mẫu tạo site để bắt đầu.</AlertDescription>
              </Alert>
            ))
          ) : (
            <Alert role="status" variant="warning">
              <AlertTitle>Chỉ đọc</AlertTitle>
              <AlertDescription>Bạn chỉ có quyền xem cấu hình site và vị trí.</AlertDescription>
            </Alert>
          )}
        </div>
        <FormModal title="Tạo site" open={siteModalOpen} onClose={() => setSiteModalOpen(false)}>
          {renderDeferredPanel(createSitePanel, () => setSiteModalOpen(false))}
        </FormModal>
        <FormModal
          title="Tạo kho"
          open={warehouseModalOpen}
          onClose={() => setWarehouseModalOpen(false)}
        >
          {renderDeferredPanel(createWarehousePanel, () => setWarehouseModalOpen(false))}
        </FormModal>
      </div>
    );
  }

  if (mode === 'master') {
    return (
      <div className="space-y-6">
        <PageHeader
          mode="master"
          canCreate={canCreate}
          onCreateSite={() => setSiteModalOpen(true)}
          onCreateWarehouse={() => setWarehouseModalOpen(true)}
        />
        <WarehouseMasterList nodes={nodes} canCreate={canCreate} />
        <FormModal title="Tạo site" open={siteModalOpen} onClose={() => setSiteModalOpen(false)}>
          {renderDeferredPanel(createSitePanel, () => setSiteModalOpen(false))}
        </FormModal>
        <FormModal
          title="Tạo kho"
          open={warehouseModalOpen}
          onClose={() => setWarehouseModalOpen(false)}
        >
          {renderDeferredPanel(createWarehousePanel, () => setWarehouseModalOpen(false))}
        </FormModal>
      </div>
    );
  }

  return (
    <DetailPageShell
      title="Sơ đồ cấu trúc kho"
      subtitle="Xem khu vực và vị trí vật lý của kho đang chọn."
      backTo={ROUTES.FOUNDATION.LOCATIONS}
      backLabel="Quay lại danh sách kho"
      contentAriaLabel="Sơ đồ cấu trúc kho chi tiết"
    >
      <WarehouseMapPanel nodes={nodes} selectedNode={selectedNode} onSelect={onSelect} />

      <SiteLocationDetailPanel
        selectedNode={selectedNode}
        locationProfiles={locationProfiles}
        canEdit={canEdit}
      />
    </DetailPageShell>
  );
}

function PageHeader({
  mode,
  canCreate,
  onCreateSite,
  onCreateWarehouse,
}: {
  mode: SiteLocationTreePageMode;
  canCreate: boolean;
  onCreateSite: () => void;
  onCreateWarehouse: () => void;
}) {
  if (mode === 'master') {
    return (
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Danh sách kho</h1>
          <p className="text-muted-foreground">
            Quản lý site, kho và mở sơ đồ cấu trúc vật lý của từng kho.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="outline" disabled={!canCreate} onClick={onCreateSite}>
            Tạo site
          </Button>
          <Button type="button" disabled={!canCreate} onClick={onCreateWarehouse}>
            Tạo kho
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Sơ đồ cấu trúc kho</h1>
        <p className="text-muted-foreground">
          Xem khu vực và vị trí vật lý của kho đang chọn.
        </p>
      </div>
      <Button asChild variant="outline">
        <a href={ROUTES.FOUNDATION.LOCATIONS}>Quay lại danh sách kho</a>
      </Button>
    </div>
  );
}

function WarehouseMasterList({ nodes, canCreate }: { nodes: SiteLocationTree[]; canCreate: boolean }) {
  const [siteFilter, setSiteFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const rows = useMemo(() => collectWarehouseRows(nodes), [nodes]);
  const sites = useMemo(() => nodes.filter((node): node is SiteNode => node.type === 'site'), [nodes]);
  const filteredRows = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLocaleLowerCase('vi-VN');

    return rows.filter((row) => {
      const siteMatched = siteFilter === 'all' || row.site.id === siteFilter;
      const searchSource = [
        row.site.entity.siteCode,
        row.site.entity.siteName,
        row.warehouse.entity.warehouseCode,
        row.warehouse.entity.warehouseName,
      ].join(' ').toLocaleLowerCase('vi-VN');

      return siteMatched && (!normalizedSearch || searchSource.includes(normalizedSearch));
    });
  }, [rows, searchTerm, siteFilter]);

  return (
    <div className="space-y-4">
      <div className="grid min-w-0 gap-3 rounded-md border bg-card p-4 md:grid-cols-[minmax(0,260px)_minmax(0,1fr)_auto] md:items-end">
        <label className="grid min-w-0 gap-1 text-sm">
          Lọc site
          <select
            className="h-10 w-full min-w-0 max-w-full rounded-md border bg-background px-3 text-sm"
            value={siteFilter}
            onChange={(event) => setSiteFilter(event.target.value)}
          >
            <option value="all">Tất cả site</option>
            {sites.map((site) => (
              <option key={site.id} value={site.id}>
                {site.entity.siteCode} - {site.entity.siteName}
              </option>
            ))}
          </select>
        </label>
        <label className="grid min-w-0 gap-1 text-sm">
          Tìm kho
          <Input
            className="min-w-0"
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
            placeholder="Mã hoặc tên kho"
          />
        </label>
        <div className="whitespace-nowrap text-sm text-muted-foreground">
          {filteredRows.length}/{rows.length} kho
        </div>
      </div>

      {!canCreate && (
        <Alert role="status" variant="warning">
          <AlertTitle>Chỉ đọc</AlertTitle>
          <AlertDescription>Bạn chỉ có quyền xem danh sách kho và sơ đồ cấu trúc.</AlertDescription>
        </Alert>
      )}

      {filteredRows.length === 0 ? (
        <Alert role="status" variant="info">
          <AlertTitle>Không có kho phù hợp</AlertTitle>
          <AlertDescription>Không tìm thấy kho theo bộ lọc hiện tại.</AlertDescription>
        </Alert>
      ) : (
        <>
          <div className="hidden rounded-md border md:block">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Site</TableHead>
                  <TableHead>Mã kho</TableHead>
                  <TableHead>Tên kho</TableHead>
                  <TableHead>Loại kho</TableHead>
                  <TableHead>Trạng thái</TableHead>
                  <TableHead className="text-right">Khu</TableHead>
                  <TableHead className="text-right">Vị trí vật lý</TableHead>
                  <TableHead className="text-right">Hành động</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredRows.map((row) => (
                  <TableRow key={row.warehouse.id}>
                    <TableCell>
                      <div className="font-medium">{row.site.entity.siteCode}</div>
                      <div className="text-xs text-muted-foreground">{row.site.entity.siteName}</div>
                    </TableCell>
                    <TableCell className="font-medium">{row.warehouse.entity.warehouseCode}</TableCell>
                    <TableCell>{row.warehouse.entity.warehouseName}</TableCell>
                    <TableCell>{row.warehouse.entity.warehouseTypeCode}</TableCell>
                    <TableCell>
                      <Badge variant={masterDataStatusVariant(row.warehouse.status)}>
                        {statusLabel(row.warehouse.status)}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">{row.zoneCount}</TableCell>
                    <TableCell className="text-right">{row.locationCount}</TableCell>
                    <TableCell className="text-right">
                      <Button asChild size="sm" variant="outline">
                        <Link
                          aria-label={`Sơ đồ kho ${row.warehouse.entity.warehouseCode}`}
                          to={ROUTES.FOUNDATION.LOCATION_MAP(row.warehouse.id)}
                        >
                          Sơ đồ kho
                        </Link>
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          <div className="grid min-w-0 gap-3 md:hidden">
            {filteredRows.map((row) => (
              <article key={row.warehouse.id} className="min-w-0 max-w-full rounded-md border bg-card p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="truncate text-sm text-muted-foreground">
                      {row.site.entity.siteCode} - {row.site.entity.siteName}
                    </div>
                    <div className="mt-1 font-semibold">{row.warehouse.entity.warehouseCode}</div>
                    <div className="text-sm">{row.warehouse.entity.warehouseName}</div>
                  </div>
                  <Badge variant={masterDataStatusVariant(row.warehouse.status)}>
                    {statusLabel(row.warehouse.status)}
                  </Badge>
                </div>
                <dl className="mt-4 grid grid-cols-3 gap-2 text-sm">
                  <div>
                    <dt className="text-xs text-muted-foreground">Loại</dt>
                    <dd className="font-medium">{row.warehouse.entity.warehouseTypeCode}</dd>
                  </div>
                  <div>
                    <dt className="text-xs text-muted-foreground">Khu</dt>
                    <dd className="font-medium">{row.zoneCount}</dd>
                  </div>
                  <div>
                    <dt className="text-xs text-muted-foreground">Vị trí</dt>
                    <dd className="font-medium">{row.locationCount}</dd>
                  </div>
                </dl>
                <Button asChild className="mt-4 w-full" size="sm" variant="outline">
                  <Link
                    aria-label={`Sơ đồ kho ${row.warehouse.entity.warehouseCode}`}
                    to={ROUTES.FOUNDATION.LOCATION_MAP(row.warehouse.id)}
                  >
                    Sơ đồ kho
                  </Link>
                </Button>
              </article>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function FormModal({
  title,
  open,
  onClose,
  children,
}: {
  title: string;
  open: boolean;
  onClose: () => void;
  children?: ReactNode;
}) {
  const titleId = useId();

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/40 px-4 py-8">
      <button
        aria-label="Đóng lớp phủ"
        className="absolute inset-0 cursor-default"
        type="button"
        onClick={onClose}
      />
      <section
        aria-labelledby={titleId}
        aria-modal="true"
        className="relative z-10 w-full max-w-xl rounded-md border bg-background p-5 shadow-lg"
        role="dialog"
      >
        <div className="mb-4 flex items-center justify-between gap-3">
          <h2 id={titleId} className="text-lg font-semibold">
            {title}
          </h2>
          <Button type="button" variant="ghost" onClick={onClose}>
            Đóng
          </Button>
        </div>
        {children ?? (
          <Alert role="status" variant="warning">
            <AlertDescription>Biểu mẫu chưa sẵn sàng.</AlertDescription>
          </Alert>
        )}
      </section>
    </div>
  );
}
