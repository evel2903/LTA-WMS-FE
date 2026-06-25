import { ROUTES } from '@app/Config/Routes';
import { ApiError } from '@shared/Services/Http/ApiError';
import { Card, CardContent, CardHeader, CardTitle } from '@shared/Components/Ui/Card';
import { useFoundationOverview } from '@modules/FoundationOverview/Application/Queries/UseFoundationOverview';
import type { QuickLink } from '@modules/FoundationOverview/Domain/Entities/FoundationReadiness';
import { FoundationChecklistPanel } from '@modules/FoundationOverview/Presentation/Components/FoundationChecklistPanel';
import { FoundationQuickLinks } from '@modules/FoundationOverview/Presentation/Components/FoundationQuickLinks';
import {
  MasterDataReadinessTable,
  WarehouseProfileReadinessTable,
} from '@modules/FoundationOverview/Presentation/Components/FoundationReadinessTable';
import { FoundationStatusBadge } from '@modules/FoundationOverview/Presentation/Components/FoundationStatusBadge';
import {
  FoundationOverviewStateView,
  NoDataScopeWarning,
} from '@modules/FoundationOverview/Presentation/Components/StateViews';

const MASTER_DATA_LINKS = {
  sites: ROUTES.FOUNDATION.LOCATIONS,
  warehouses: ROUTES.FOUNDATION.LOCATIONS,
  zones: ROUTES.FOUNDATION.LOCATIONS,
  locations: ROUTES.FOUNDATION.LOCATIONS,
} as const;

const QUICK_LINKS: QuickLink[] = [
  { label: 'Cây site và vị trí', to: ROUTES.FOUNDATION.LOCATIONS },
  { label: 'Hồ sơ vị trí', to: ROUTES.FOUNDATION.LOCATION_PROFILES },
  { label: 'Chủ hàng', to: ROUTES.FOUNDATION.MASTER_DATA.OWNERS },
  { label: 'Đơn vị tính', to: ROUTES.FOUNDATION.MASTER_DATA.UOMS },
  { label: 'SKU', to: ROUTES.FOUNDATION.MASTER_DATA.SKUS },
  { label: 'Hồ sơ kho', to: ROUTES.FOUNDATION.WAREHOUSE_PROFILES },
  { label: 'Ma trận quy tắc', to: ROUTES.FOUNDATION.RULE_MATRIX },
  { label: 'Vai trò và quyền', to: ROUTES.FOUNDATION.ACCESS.ROLES },
  { label: 'Người dùng và phân quyền', to: ROUTES.FOUNDATION.ACCESS.USERS },
  { label: 'Nhật ký kiểm toán', to: ROUTES.FOUNDATION.AUDIT },
  { label: 'Hàng đợi ngoại lệ', to: ROUTES.FOUNDATION.EXCEPTIONS },
  { label: 'Mã lý do', to: ROUTES.FOUNDATION.REASON_CODES },
  { label: 'Trạng thái tồn kho', to: ROUTES.FOUNDATION.INVENTORY_STATUS },
  { label: 'Hàng đợi phê duyệt', to: ROUTES.FOUNDATION.APPROVALS },
  { label: 'Nhật ký ghi đè', to: ROUTES.FOUNDATION.OVERRIDES },
];

export function FoundationOverviewPage() {
  const query = useFoundationOverview();
  const overview = query.data;
  const apiError = query.error instanceof ApiError ? query.error : null;
  const viewState = apiError?.isForbidden
    ? 'denied'
    : query.isLoading
      ? 'loading'
      : query.error
        ? 'error'
        : query.data
          ? 'ready'
          : 'empty';

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Tổng quan nền tảng</h1>
          <p className="text-muted-foreground">
            Tổng quan readiness cấu hình V0 theo master data, active warehouse profile và checklist
            B7.
          </p>
        </div>
        {overview ? <FoundationStatusBadge status={overview.overallStatus} /> : null}
      </div>

      {viewState !== 'ready' || !overview ? (
        <FoundationOverviewStateView
          state={viewState === 'ready' ? 'empty' : viewState}
          errorMessage={apiError?.message ?? 'Không thể tải mức sẵn sàng nền tảng.'}
        />
      ) : (
        <>
          {overview.warnings.map((warning) => (
            <NoDataScopeWarning key={warning} message={warning} />
          ))}

          <div className="grid gap-6 xl:grid-cols-[1fr_360px]">
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Mức sẵn sàng dữ liệu chủ</CardTitle>
                </CardHeader>
                <CardContent>
                  <MasterDataReadinessTable
                    rows={overview.masterDataRows}
                    links={MASTER_DATA_LINKS}
                  />
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Mức sẵn sàng hồ sơ kho</CardTitle>
                </CardHeader>
                <CardContent>
                  {overview.warehouseProfileRows.length > 0 ? (
                    <WarehouseProfileReadinessTable
                      rows={overview.warehouseProfileRows}
                      profileTo={ROUTES.FOUNDATION.WAREHOUSE_PROFILES}
                    />
                  ) : (
                    <p className="text-muted-foreground text-sm">Không có kho nào hiển thị trong phạm vi dữ liệu hiện tại.</p>
                  )}
                </CardContent>
              </Card>
            </div>

            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Danh sách kiểm tra B7</CardTitle>
                </CardHeader>
                <CardContent>
                  <FoundationChecklistPanel rows={overview.warehouseProfileRows} />
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Liên kết nhanh</CardTitle>
                </CardHeader>
                <CardContent>
                  <FoundationQuickLinks links={QUICK_LINKS} />
                </CardContent>
              </Card>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
