import type { ReactNode } from 'react';

import { Card, CardContent, CardHeader, CardTitle } from '@shared/Components/Ui/Card';
import type { LocationProfile } from '@modules/MasterData/Domain/Types/MasterDataTree';
import type { SiteLocationTree } from '@modules/MasterData/Domain/Types/MasterDataTree';
import { EntityTree } from '@modules/MasterData/Presentation/Components/EntityTree';
import { SiteLocationDetailPanel } from '@modules/MasterData/Presentation/Components/SiteLocationDetailPanel';

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
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Không có quyền</CardTitle>
          </CardHeader>
          <CardContent className="text-muted-foreground text-sm">Bạn không có quyền đọc cây site và vị trí trong phạm vi này.</CardContent>
        </Card>
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
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Không thể tải cây site và vị trí</CardTitle>
          </CardHeader>
          <CardContent className="text-destructive text-sm">
            {errorMessage ?? 'Đã xảy ra lỗi API không mong muốn.'}
          </CardContent>
        </Card>
      </div>
    );
  }

  if (state === 'empty') {
    return (
      <div className="space-y-6">
        <PageHeader />
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Chưa có site</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm text-muted-foreground">
            <p>Tạo site đầu tiên trước khi thêm kho, khu vực và vị trí.</p>
            {canCreate ? (
              (formPanel ?? <p>Dùng biểu mẫu tạo site để bắt đầu.</p>)
            ) : (
              <p>Chỉ đọc</p>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader />
      <div className="grid gap-6 xl:grid-cols-[420px_1fr]">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Cây site và vị trí</CardTitle>
          </CardHeader>
          <CardContent>
            <EntityTree nodes={nodes} selectedNodeId={selectedNode?.id ?? null} onSelect={onSelect} />
          </CardContent>
        </Card>

        <div className="space-y-6">
          <SiteLocationDetailPanel
            selectedNode={selectedNode}
            locationProfiles={locationProfiles}
            canEdit={canEdit}
          />
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
