import type { ReactNode } from 'react';

import { Alert, AlertDescription, AlertTitle } from '@shared/Components/Reui/alert';
import { Card, CardContent, CardHeader, CardTitle } from '@shared/Components/Ui/Card';
import type { LocationProfile } from '@modules/MasterData/Domain/Types/MasterDataTree';
import type { SiteLocationTree } from '@modules/MasterData/Domain/Types/MasterDataTree';
import { EntityTree } from '@modules/MasterData/Presentation/Components/EntityTree';
import { SiteLocationDetailPanel } from '@modules/MasterData/Presentation/Components/SiteLocationDetailPanel';
import { WarehouseMapPanel } from '@modules/MasterData/Presentation/Components/WarehouseMapPanel';

export type SiteLocationTreePageState = 'loading' | 'empty' | 'ready' | 'error' | 'denied';

interface SiteLocationTreePageViewProps {
  state: SiteLocationTreePageState;
  nodes: SiteLocationTree[];
  selectedNode: SiteLocationTree | null;
  locationProfiles: LocationProfile[];
  canCreate: boolean;
  canEdit: boolean;
  errorMessage?: string;
  formPanel?: ReactNode;
  onSelect: (node: SiteLocationTree) => void;
}

export function SiteLocationTreePageView({
  state,
  nodes,
  selectedNode,
  locationProfiles,
  canCreate,
  canEdit,
  errorMessage,
  formPanel,
  onSelect,
}: SiteLocationTreePageViewProps) {
  if (state === 'denied') {
    return (
      <div className="space-y-6">
        <PageHeader />
        <Alert role="status" variant="warning">
          <AlertTitle>Không có quyền</AlertTitle>
          <AlertDescription>Bạn không có quyền đọc cây site và vị trí trong phạm vi này.</AlertDescription>
        </Alert>
      </div>
    );
  }

  if (state === 'loading') {
    return (
      <div className="space-y-6">
        <PageHeader />
        <Card>
          <CardContent className="py-10 text-sm text-muted-foreground">Đang tải cây site và vị trí...</CardContent>
        </Card>
      </div>
    );
  }

  if (state === 'error') {
    return (
      <div className="space-y-6">
        <PageHeader />
        <Alert variant="destructive">
          <AlertTitle>Không thể tải cây site và vị trí</AlertTitle>
          <AlertDescription>{errorMessage ?? 'Đã xảy ra lỗi API không mong muốn.'}</AlertDescription>
        </Alert>
      </div>
    );
  }

  if (state === 'empty') {
    return (
      <div className="space-y-6">
        <PageHeader />
        <div className="space-y-4">
          <Alert role="status" variant="info">
            <AlertTitle>Chưa có site</AlertTitle>
            <AlertDescription>Tạo site đầu tiên trước khi thêm kho, khu vực và vị trí.</AlertDescription>
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
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader />
      <div className="grid gap-6 2xl:grid-cols-[360px_minmax(0,1fr)]">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Cây kho và vị trí</CardTitle>
          </CardHeader>
          <CardContent>
            <EntityTree nodes={nodes} selectedNodeId={selectedNode?.id ?? null} onSelect={onSelect} />
          </CardContent>
        </Card>

        <WarehouseMapPanel nodes={nodes} selectedNode={selectedNode} onSelect={onSelect} />
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_420px]">
        <div>
          <SiteLocationDetailPanel
            selectedNode={selectedNode}
            locationProfiles={locationProfiles}
            canEdit={canEdit}
          />
        </div>
        <div>
          {formPanel}
        </div>
      </div>
    </div>
  );
}

function PageHeader() {
  return (
    <div className="flex items-center justify-between gap-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Cây site và vị trí</h1>
        <p className="text-muted-foreground">Cấu hình site, kho, khu vực, vị trí và ràng buộc hồ sơ vị trí.</p>
      </div>
    </div>
  );
}
