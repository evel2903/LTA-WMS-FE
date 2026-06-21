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
  { label: 'Site & Location Tree', to: ROUTES.FOUNDATION.LOCATIONS },
  { label: 'Owner Master', to: ROUTES.FOUNDATION.MASTER_DATA.OWNERS },
  { label: 'UOM Master', to: ROUTES.FOUNDATION.MASTER_DATA.UOMS },
  { label: 'SKU Master', to: ROUTES.FOUNDATION.MASTER_DATA.SKUS },
  { label: 'Warehouse Profiles', to: ROUTES.FOUNDATION.WAREHOUSE_PROFILES },
  { label: 'Rule Matrix', to: ROUTES.FOUNDATION.RULE_MATRIX },
  { label: 'Roles & Permissions', to: ROUTES.FOUNDATION.ACCESS.ROLES },
  { label: 'Users & Assignments', to: ROUTES.FOUNDATION.ACCESS.USERS },
  { label: 'Audit Log', to: ROUTES.FOUNDATION.AUDIT },
  { label: 'Exception Queue', to: ROUTES.FOUNDATION.EXCEPTIONS },
  { label: 'Reason Codes', to: ROUTES.FOUNDATION.REASON_CODES },
  { label: 'Inventory Status', to: ROUTES.FOUNDATION.INVENTORY_STATUS },
  { label: 'Approval Queue', to: ROUTES.FOUNDATION.APPROVALS },
  { label: 'Override Log', to: ROUTES.FOUNDATION.OVERRIDES },
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
          <h1 className="text-2xl font-semibold tracking-tight">Foundation Overview</h1>
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
          errorMessage={apiError?.message ?? 'Unable to load Foundation readiness.'}
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
                  <CardTitle className="text-base">Master data readiness</CardTitle>
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
                  <CardTitle className="text-base">Warehouse profile readiness</CardTitle>
                </CardHeader>
                <CardContent>
                  {overview.warehouseProfileRows.length > 0 ? (
                    <WarehouseProfileReadinessTable
                      rows={overview.warehouseProfileRows}
                      profileTo={ROUTES.FOUNDATION.WAREHOUSE_PROFILES}
                    />
                  ) : (
                    <p className="text-muted-foreground text-sm">
                      No warehouse is visible for the current data scope.
                    </p>
                  )}
                </CardContent>
              </Card>
            </div>

            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Checklist B7</CardTitle>
                </CardHeader>
                <CardContent>
                  <FoundationChecklistPanel rows={overview.warehouseProfileRows} />
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Quick links</CardTitle>
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
