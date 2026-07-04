import { ROUTES } from '@app/Config/Routes';
import { ApiError } from '@shared/Services/Http/ApiError';
import { GovernanceStateBanner, ListPageShell } from '@shared/Components/Page';
import type { PageBoundaryState } from '@shared/Components/Page';
import { Card, CardContent, CardHeader, CardTitle } from '@shared/Components/Ui/Card';
import { useFoundationOverview } from '@modules/FoundationOverview/Application/Queries/UseFoundationOverview';
import type {
  FoundationOverviewReadiness,
  MasterDataReadinessRow,
  WarehouseProfileReadinessRow,
} from '@modules/FoundationOverview/Domain/Entities/FoundationReadiness';
import { FoundationChecklistPanel } from '@modules/FoundationOverview/Presentation/Components/FoundationChecklistPanel';
import { FoundationQuickLinks } from '@modules/FoundationOverview/Presentation/Components/FoundationQuickLinks';
import type { QuickLinkGroup } from '@modules/FoundationOverview/Presentation/Components/FoundationQuickLinks';
import {
  MasterDataReadinessTable,
  WarehouseProfileReadinessTable,
} from '@modules/FoundationOverview/Presentation/Components/FoundationReadinessTable';
import { FoundationStatusBadge } from '@modules/FoundationOverview/Presentation/Components/FoundationStatusBadge';

const MASTER_DATA_LINKS = {
  sites: ROUTES.FOUNDATION.SITES,
  warehouses: ROUTES.FOUNDATION.LOCATIONS,
  zones: ROUTES.FOUNDATION.ZONES,
  locations: ROUTES.FOUNDATION.PHYSICAL_LOCATIONS,
} as const;

const QUICK_LINK_GROUPS: QuickLinkGroup[] = [
  {
    title: 'Tổng quan',
    description: 'Quay lại trung tâm điều phối và trạng thái sẵn sàng.',
    links: [{ label: 'Tổng quan nền tảng', to: ROUTES.FOUNDATION.ROOT }],
  },
  {
    title: 'Cấu trúc vật lý',
    description: 'Site, kho, zone, vị trí và hồ sơ vị trí.',
    links: [
      { label: 'Danh mục site', to: ROUTES.FOUNDATION.SITES },
      { label: 'Kho và sơ đồ kho', to: ROUTES.FOUNDATION.LOCATIONS },
      { label: 'Danh mục zone', to: ROUTES.FOUNDATION.ZONES },
      { label: 'Vị trí vật lý', to: ROUTES.FOUNDATION.PHYSICAL_LOCATIONS },
      { label: 'Loại kho', to: ROUTES.FOUNDATION.WAREHOUSE_TYPES },
      { label: 'Hồ sơ vị trí', to: ROUTES.FOUNDATION.LOCATION_PROFILES },
    ],
  },
  {
    title: 'Sản phẩm và đóng gói',
    description: 'Chủ hàng, đơn vị tính, SKU và đối tác.',
    links: [
      { label: 'Chủ hàng', to: ROUTES.FOUNDATION.MASTER_DATA.OWNERS },
      { label: 'Đơn vị tính', to: ROUTES.FOUNDATION.MASTER_DATA.UOMS },
      { label: 'SKU và quan hệ', to: ROUTES.FOUNDATION.MASTER_DATA.SKUS },
      { label: 'Đối tác', to: ROUTES.FOUNDATION.MASTER_DATA.PARTNERS },
    ],
  },
  {
    title: 'Quy tắc và hồ sơ',
    description: 'Hồ sơ kho, ma trận quy tắc và xem trước kiểm soát.',
    links: [
      { label: 'Hồ sơ kho', to: ROUTES.FOUNDATION.WAREHOUSE_PROFILES },
      { label: 'Ma trận quy tắc', to: ROUTES.FOUNDATION.RULE_MATRIX },
    ],
  },
  {
    title: 'Quản trị và kiểm soát',
    description: 'Phân quyền, nhật ký, hàng đợi và danh mục kiểm soát.',
    links: [
      { label: 'Vai trò và quyền', to: ROUTES.FOUNDATION.ACCESS.ROLES },
      { label: 'Người dùng và phân quyền', to: ROUTES.FOUNDATION.ACCESS.USERS },
      { label: 'Kiểm soát xác thực', to: ROUTES.FOUNDATION.CONTROL_CATALOG },
      { label: 'Mã lý do', to: ROUTES.FOUNDATION.REASON_CODES },
      { label: 'Trạng thái tồn kho', to: ROUTES.FOUNDATION.INVENTORY_STATUS },
      { label: 'Nhật ký kiểm toán', to: ROUTES.FOUNDATION.AUDIT },
      { label: 'Hàng đợi ngoại lệ', to: ROUTES.FOUNDATION.EXCEPTIONS },
      { label: 'Hàng đợi phê duyệt', to: ROUTES.FOUNDATION.APPROVALS },
      { label: 'Nhật ký ghi đè', to: ROUTES.FOUNDATION.OVERRIDES },
    ],
  },
];

const MASTER_DATA_LABELS: Record<MasterDataReadinessRow['key'], string> = {
  sites: 'Site',
  warehouses: 'Kho',
  zones: 'Zone',
  locations: 'Vị trí',
};

const MASTER_DATA_MISSING_MESSAGES: Record<MasterDataReadinessRow['key'], string> = {
  sites: 'Chưa có site hiển thị trong phạm vi hiện tại.',
  warehouses: 'Chưa có kho hiển thị; cần kiểm tra setup hoặc phạm vi dữ liệu.',
  zones: 'Chưa có zone được cấu hình dưới các kho đang hiển thị.',
  locations: 'Chưa có vị trí được cấu hình dưới các zone đang hiển thị.',
};

const CHECKLIST_STATUS_LABELS: Record<string, string> = {
  PASS: 'đạt',
  WARN: 'cần kiểm tra',
  WARNING: 'cần kiểm tra',
  FAIL: 'chưa đạt',
  DEFERRED: 'dời sau',
};

function localizeChecklistStatus(status: string): string {
  return CHECKLIST_STATUS_LABELS[status] ?? 'không rõ';
}

function boundaryState(query: ReturnType<typeof useFoundationOverview>, apiError: ApiError | null): PageBoundaryState | null {
  if (apiError?.isForbidden) return 'forbidden';
  if (query.isLoading) return 'loading';
  if (query.error) return 'error';
  return query.data ? null : 'empty';
}

function boundaryCopy(state: PageBoundaryState | null, apiError: ApiError | null) {
  if (state === 'loading') {
    return {
      title: 'Đang tải tổng quan nền tảng',
      message: 'Màn hình đang tổng hợp readiness mới nhất.',
    };
  }
  if (state === 'forbidden') {
    return {
      title: 'Không có quyền xem Foundation',
      message: 'Bạn không có quyền xem mức sẵn sàng nền tảng trong phạm vi hiện tại.',
    };
  }
  if (state === 'error') {
    return {
      title: 'Không thể tải tổng quan nền tảng',
      message: apiError?.message ?? 'Không thể tải mức sẵn sàng nền tảng.',
    };
  }
  if (state === 'empty') {
    return {
      title: 'Chưa có dữ liệu nền tảng',
      message: 'Không có dữ liệu nền tảng nào hiển thị trong phạm vi hiện tại.',
    };
  }
  return { title: undefined, message: undefined };
}

function localizeMasterDataRows(rows: MasterDataReadinessRow[]): MasterDataReadinessRow[] {
  return rows.map((row) => ({
    ...row,
    label: MASTER_DATA_LABELS[row.key],
    message:
      row.count > 0
        ? `${row.count} bản ghi hiển thị trong phạm vi hiện tại.`
        : MASTER_DATA_MISSING_MESSAGES[row.key],
  }));
}

function localizeWarehouseProfileDiagnostic(message: string): string | null {
  if (!message.trim()) return null;
  if (message === 'No ACTIVE warehouse profile is visible for this warehouse/type.') {
    return 'Chưa có hồ sơ kho ACTIVE hiển thị cho kho hoặc loại kho này.';
  }
  if (message === 'No checklist result is available.') {
    return 'Chưa có kết quả checklist B7.';
  }

  const activeCandidates = message.match(/(?:^|\s)(\d+) active profile candidates are visible\.$/);
  if (activeCandidates) {
    return `Có ${activeCandidates[1]} hồ sơ kho ACTIVE cùng khớp phạm vi.`;
  }
  if (
    message === 'Checklist B7 result is not available.' ||
    /^Checklist B7 (PASS|WARN|WARNING|FAIL|DEFERRED)\.$/.test(message)
  ) {
    return null;
  }

  return 'Cần kiểm tra cấu hình hồ sơ kho; thông báo chi tiết chưa được chuẩn hóa tiếng Việt.';
}

function localizeWarehouseProfileMessage(row: WarehouseProfileReadinessRow): string {
  if (!row.activeProfileCode) {
    return 'Chưa có hồ sơ kho ACTIVE hiển thị cho kho hoặc loại kho này.';
  }

  const checklistStatus = row.checklist ? localizeChecklistStatus(row.checklist.overallStatus) : null;
  const checklistMessage = checklistStatus
    ? `Checklist B7 ${checklistStatus}.`
    : 'Chưa có kết quả checklist B7.';
  const diagnosticMessage = localizeWarehouseProfileDiagnostic(row.message);

  if (!diagnosticMessage || diagnosticMessage === checklistMessage) return checklistMessage;
  return `${checklistMessage} ${diagnosticMessage}`;
}

function localizeWarehouseProfileRows(
  rows: WarehouseProfileReadinessRow[],
): WarehouseProfileReadinessRow[] {
  return rows.map((row) => ({
    ...row,
    message: localizeWarehouseProfileMessage(row),
  }));
}

function localizeWarning(message: string): string {
  if (message.includes('No warehouse/owner scope assigned')) {
    return 'Chưa có kho hoặc phạm vi chủ hàng hiển thị trong phạm vi hiện tại.';
  }
  return 'Cần kiểm tra phạm vi dữ liệu nền tảng trong cấu hình hiện tại.';
}

function localizeOverview(overview: FoundationOverviewReadiness): FoundationOverviewReadiness {
  return {
    ...overview,
    masterDataRows: localizeMasterDataRows(overview.masterDataRows),
    warehouseProfileRows: localizeWarehouseProfileRows(overview.warehouseProfileRows),
    warnings: overview.warnings.map(localizeWarning),
  };
}

export function FoundationOverviewPage() {
  const query = useFoundationOverview();
  const overview = query.data ? localizeOverview(query.data) : undefined;
  const apiError = query.error instanceof ApiError ? query.error : null;
  const state = boundaryState(query, apiError);
  const stateCopy = boundaryCopy(state, apiError);

  return (
    <ListPageShell
      title="Tổng quan nền tảng"
      description="Trung tâm điều phối mức sẵn sàng cấu hình Foundation theo dữ liệu chủ, hồ sơ kho ACTIVE và checklist B7."
      toolbar={overview ? <FoundationStatusBadge status={overview.overallStatus} /> : undefined}
      state={state}
      stateTitle={stateCopy.title}
      stateMessage={stateCopy.message}
      contentAriaLabel="Tổng quan nền tảng danh sách"
    >
      {overview ? (
        <>
          {overview.warnings.map((warning) => (
            <GovernanceStateBanner
              key={warning}
              state={overview.noDataScope ? 'missingSetup' : 'warning'}
              title={overview.noDataScope ? 'Thiếu phạm vi kho' : 'Cần kiểm tra cấu hình'}
              message={warning}
            />
          ))}

          <div className="grid min-w-0 gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
            <div className="min-w-0 space-y-6">
              <Card className="min-w-0">
                <CardHeader>
                  <CardTitle className="text-base">Mức sẵn sàng dữ liệu chủ</CardTitle>
                </CardHeader>
                <CardContent className="min-w-0">
                  <MasterDataReadinessTable
                    rows={overview.masterDataRows}
                    links={MASTER_DATA_LINKS}
                  />
                </CardContent>
              </Card>

              <Card className="min-w-0">
                <CardHeader>
                  <CardTitle className="text-base">Mức sẵn sàng hồ sơ kho</CardTitle>
                </CardHeader>
                <CardContent className="min-w-0">
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

            <div className="min-w-0 space-y-6">
              <Card className="min-w-0">
                <CardHeader>
                  <CardTitle className="text-base">Danh sách kiểm tra B7</CardTitle>
                </CardHeader>
                <CardContent className="min-w-0">
                  <FoundationChecklistPanel rows={overview.warehouseProfileRows} />
                </CardContent>
              </Card>

              <Card className="min-w-0">
                <CardHeader>
                  <CardTitle className="text-base">Liên kết nhanh</CardTitle>
                </CardHeader>
                <CardContent className="min-w-0">
                  <FoundationQuickLinks groups={QUICK_LINK_GROUPS} />
                </CardContent>
              </Card>
            </div>
          </div>
        </>
      ) : null}
    </ListPageShell>
  );
}
