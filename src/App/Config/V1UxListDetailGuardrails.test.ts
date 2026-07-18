import { readdirSync, readFileSync, statSync } from 'node:fs';
import { extname, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

import { ROUTES } from '@app/Config/Routes';

const srcRoot = fileURLToPath(new URL('../../', import.meta.url));
const sourceExtensions = new Set(['.ts', '.tsx']);

function sourcePath(relativePath: string): string {
  return resolve(srcRoot, relativePath);
}

function readSource(relativePath: string): string {
  return readFileSync(sourcePath(relativePath), 'utf8');
}

function sourceExists(relativePath: string): boolean {
  try {
    return statSync(sourcePath(relativePath)).isFile();
  } catch {
    return false;
  }
}

function collectSourceFiles(relativeRoot: string): string[] {
  const root = sourcePath(relativeRoot);
  const result: string[] = [];

  const visit = (current: string) => {
    for (const entry of readdirSync(current, { withFileTypes: true })) {
      const fullPath = resolve(current, entry.name);
      if (entry.isDirectory()) {
        visit(fullPath);
        continue;
      }
      if (entry.isFile() && sourceExtensions.has(extname(entry.name))) {
        result.push(relative(srcRoot, fullPath).replace(/\\/g, '/'));
      }
    }
  };

  visit(root);
  return result.sort();
}

const migratedRootPages = [
  ['Modules/PartnerMaster/Presentation/Pages/PartnerMasterPage.tsx', 'CatalogListView'],
  ['Modules/MasterData/Presentation/Pages/OwnerMasterPage.tsx', 'CatalogListView'],
  ['Modules/MasterData/Presentation/Pages/UomMasterPage.tsx', 'CatalogListView'],
  ['Modules/MasterData/Presentation/Pages/SkuMasterPage.tsx', 'CatalogListView'],
  ['Modules/MasterData/Presentation/Pages/LocationProfileCatalogPage.tsx', 'ListPageShell'],
  ['Modules/ReasonCode/Presentation/Pages/ReasonCodeCatalogPage.tsx', 'ListPageShell'],
  ['Modules/InventoryStatus/Presentation/Pages/InventoryStatusCatalogPage.tsx', 'ListPageShell'],
  ['Modules/WarehouseProfile/Presentation/Pages/WarehouseProfilesPage.tsx', 'ListPageShell'],
  ['Modules/AccessControl/Presentation/Pages/UsersAssignmentsPage.tsx', 'ListPageShell'],
  ['Modules/Approval/Presentation/Pages/ApprovalQueuePage.tsx', 'ListPageShell'],
  ['Modules/Compliance/Presentation/Pages/ExceptionQueuePage.tsx', 'ListPageShell'],
  ['Modules/InboundPlan/Presentation/Pages/InboundPlanPage.tsx', 'ListPageShell'],
  ['Modules/Putaway/Presentation/Pages/PutawayPage.tsx', 'ListPageShell'],
  ['Modules/TaskExecution/Presentation/Pages/TaskExecutionPage.tsx', 'ListPageShell'],
  ['Modules/BarcodeLabel/Presentation/Pages/BarcodeLabelPage.tsx', 'ListPageShell'],
  ['Modules/CycleCount/Presentation/Pages/CycleCountPage.tsx', 'ListPageShell'],
  ['Modules/Replenishment/Presentation/Pages/ReplenishmentPage.tsx', 'ListPageShell'],
  ['Modules/Outbound/Presentation/Pages/OutboundPage.tsx', 'ListPageShell'],
  ['Modules/Compliance/Presentation/Pages/AuditLogPage.tsx', 'ListPageShell'],
  ['Modules/OverrideLog/Presentation/Pages/OverrideLogPage.tsx', 'ListPageShell'],
] as const;

const representativeDetailPages = [
  'Modules/PartnerMaster/Presentation/Pages/PartnerMasterDetailPage.tsx',
  'Modules/MasterData/Presentation/Pages/OwnerMasterDetailPage.tsx',
  'Modules/MasterData/Presentation/Pages/SkuMasterDetailPage.tsx',
  'Modules/MasterData/Presentation/Pages/LocationProfileDetailPage.tsx',
  'Modules/ReasonCode/Presentation/Pages/ReasonCodeDetailPage.tsx',
  'Modules/InventoryStatus/Presentation/Pages/InventoryStatusDetailPage.tsx',
  'Modules/WarehouseProfile/Presentation/Pages/WarehouseProfileDetailPage.tsx',
  'Modules/AccessControl/Presentation/Pages/UserAssignmentDetailPage.tsx',
  'Modules/Approval/Presentation/Pages/ApprovalRequestDetailPage.tsx',
  'Modules/Compliance/Presentation/Pages/ExceptionDetailPage.tsx',
  'Modules/InboundReceiving/Presentation/Pages/InboundReceivingDetailPage.tsx',
  'Modules/Putaway/Presentation/Pages/PutawayDetailPage.tsx',
  'Modules/TaskExecution/Presentation/Pages/TaskExecutionDetailPage.tsx',
  'Modules/BarcodeLabel/Presentation/Pages/BarcodeLabelDetailPage.tsx',
  'Modules/CycleCount/Presentation/Pages/CycleCountDetailPage.tsx',
  'Modules/Replenishment/Presentation/Pages/ReplenishmentDetailPage.tsx',
  'Modules/Outbound/Presentation/Pages/OutboundDetailPage.tsx',
  'Modules/Compliance/Presentation/Pages/AuditLogDetailPage.tsx',
  'Modules/OverrideLog/Presentation/Pages/OverrideLogDetailPage.tsx',
] as const;

const rootPageActionFormTokens = [
  /<form[\s>]/i,
  /ActionPanel/,
  /Reason note/i,
  /Evidence refs/i,
  /Idempotency key/i,
  /Approval decision/i,
  /Override reason/i,
  /Scan value/i,
  /Actual quantity/i,
  /Accepted quantity/i,
  /Rejected quantity/i,
  /Confirm receipt/i,
  /Record QC/i,
  /Reprint reason/i,
  /Submit count/i,
  /Post adjustment/i,
] as const;

const pageSizeGuardrailSources = [
  [
    'Modules/MasterData/Domain/Constants/CatalogConstants.ts',
    /CATALOG_DEFAULT_PAGE_SIZE = 50/,
    /CATALOG_MAX_PAGE_SIZE = 100/,
  ],
  [
    'Modules/MasterData/Domain/Constants/MasterDataConstants.ts',
    /MASTER_DATA_DEFAULT_PAGE_SIZE = 50/,
    /MASTER_DATA_MAX_PAGE_SIZE = 100/,
  ],
  [
    'Modules/PartnerMaster/Domain/Constants/PartnerConstants.ts',
    /PARTNER_DEFAULT_PAGE_SIZE = 50/,
    /PARTNER_MAX_PAGE_SIZE = 100/,
  ],
  [
    'Modules/WarehouseProfile/Domain/Constants/PrecedenceOrder.ts',
    /WAREHOUSE_PROFILE_DEFAULT_PAGE_SIZE = 50/,
    /WAREHOUSE_PROFILE_DEFAULT_PAGE_SIZE = 50/,
  ],
  [
    'Modules/WarehouseProfile/Infrastructure/Repositories/WarehouseProfileRepository.ts',
    /WAREHOUSE_PROFILE_DEFAULT_PAGE_SIZE/,
    /MAX_PAGE_SIZE = 100/,
  ],
  [
    'Modules/AccessControl/Infrastructure/Repositories/AccessControlRepository.ts',
    /DEFAULT_PAGE_SIZE = 50/,
    /MAX_PAGE_SIZE = 100/,
  ],
  [
    'Modules/Approval/Infrastructure/Repositories/ApprovalRepository.ts',
    /DEFAULT_PAGE_SIZE = 50/,
    /MAX_PAGE_SIZE = 100/,
  ],
  [
    'Modules/Compliance/Infrastructure/Repositories/ComplianceRepository.ts',
    /DEFAULT_PAGE_SIZE = 50/,
    /MAX_PAGE_SIZE = 100/,
  ],
  [
    'Modules/ReasonCode/Infrastructure/Repositories/ReasonCodeRepository.ts',
    /DEFAULT_PAGE_SIZE = 50/,
    /MAX_PAGE_SIZE = 100/,
  ],
  [
    'Modules/InventoryStatus/Infrastructure/Repositories/InventoryStatusRepository.ts',
    /DEFAULT_PAGE_SIZE = 50/,
    /MAX_PAGE_SIZE = 100/,
  ],
  [
    'Modules/OverrideLog/Infrastructure/Repositories/OverrideLogRepository.ts',
    /DEFAULT_PAGE_SIZE = 50/,
    /MAX_PAGE_SIZE = 100/,
  ],
  [
    'Modules/InboundPlan/Domain/Constants/InboundPlanConstants.ts',
    /INBOUND_DEFAULT_PAGE_SIZE = 50/,
    /INBOUND_MAX_PAGE_SIZE = 100/,
  ],
  [
    'Modules/Putaway/Domain/Constants/PutawayConstants.ts',
    /PUTAWAY_DEFAULT_PAGE_SIZE = 50/,
    /PUTAWAY_MAX_PAGE_SIZE = 100/,
  ],
  [
    'Modules/BarcodeLabel/Domain/Constants/BarcodeLabelConstants.ts',
    /BARCODE_LABEL_DEFAULT_PAGE_SIZE = 50/,
    /BARCODE_LABEL_MAX_PAGE_SIZE = 100/,
  ],
  [
    'Modules/TaskExecution/Domain/Constants/MobileTaskConstants.ts',
    /MOBILE_TASK_DEFAULT_PAGE_SIZE = 50/,
    /MOBILE_TASK_MAX_PAGE_SIZE = 100/,
  ],
  [
    'Modules/CycleCount/Domain/Constants/CycleCountConstants.ts',
    /CYCLE_COUNT_DEFAULT_PAGE_SIZE = 50/,
    /CYCLE_COUNT_MAX_PAGE_SIZE = 100/,
  ],
  [
    'Modules/Replenishment/Domain/Constants/ReplenishmentConstants.ts',
    /REPLENISHMENT_DEFAULT_PAGE_SIZE = 50/,
    /REPLENISHMENT_MAX_PAGE_SIZE = 100/,
  ],
  [
    'Modules/Outbound/Domain/Constants/OutboundConstants.ts',
    /OUTBOUND_DEFAULT_PAGE_SIZE = 50/,
    /OUTBOUND_MAX_PAGE_SIZE = 100/,
  ],
] as const;

const placeholderOnlyOperationalRouteRefs = [
  'ROUTES.WAREHOUSE.ROOT',
  'ROUTES.PICKING.ROOT',
  'ROUTES.STOCK_TRANSFER.ROOT',
  'ROUTES.STOCK_ADJUSTMENT.ROOT',
  'ROUTES.REPORTS.ROOT',
] as const;

describe('V1-UX list/detail guardrails', () => {
  it('keeps representative list, create, detail and action route constants stable', () => {
    expect({
      partnerList: ROUTES.FOUNDATION.MASTER_DATA.PARTNERS,
      partnerCreate: ROUTES.FOUNDATION.MASTER_DATA.PARTNER_NEW,
      partnerDetail: ROUTES.FOUNDATION.MASTER_DATA.PARTNER_DETAIL('partner-1'),
      partnerEdit: ROUTES.FOUNDATION.MASTER_DATA.PARTNER_EDIT('partner-1'),
      warehouseProfileDetail: ROUTES.FOUNDATION.WAREHOUSE_PROFILE_DETAIL('profile-1'),
      userDetail: ROUTES.FOUNDATION.ACCESS.USER_DETAIL('user-1'),
      approvalAction: ROUTES.FOUNDATION.APPROVAL_ACTION('approval-1'),
      exceptionAction: ROUTES.FOUNDATION.EXCEPTION_ACTION('exception-1'),
      auditEncodedDetail: ROUTES.FOUNDATION.AUDIT_DETAIL('audit/1'),
      overrideEncodedDetail: ROUTES.FOUNDATION.OVERRIDE_DETAIL('override/1'),
      inboundAction: ROUTES.INBOUND_RECEIVING.ACTION('inbound-1', 'receiving'),
      putawayAction: ROUTES.PUTAWAY.ACTION('putaway-1', 'confirm'),
      mobileTaskAction: ROUTES.MOBILE.TASK_ACTION('task-1', 'scan'),
      labelTemplateAction: ROUTES.LABELS.TEMPLATE_ACTION('template-1', 'preview'),
      labelPrintJobAction: ROUTES.LABELS.PRINT_JOB_ACTION('job-1', 'reprint'),
      cycleCountAction: ROUTES.CYCLE_COUNT.ACTION('count-1', 'submit'),
      replenishmentAction: ROUTES.REPLENISHMENT.ACTION('replenishment-1', 'confirm'),
      outboundCreate: ROUTES.OUTBOUND.NEW,
      outboundAction: ROUTES.OUTBOUND.ACTION('outbound-1', 'hold'),
    }).toEqual({
      partnerList: '/foundation/master-data/partners',
      partnerCreate: '/foundation/master-data/partners/new',
      partnerDetail: '/foundation/master-data/partners/partner-1',
      partnerEdit: '/foundation/master-data/partners/partner-1/edit',
      warehouseProfileDetail: '/foundation/warehouse-profiles/profile-1',
      userDetail: '/foundation/access/users/user-1',
      approvalAction: '/foundation/approvals/approval-1/action',
      exceptionAction: '/foundation/exceptions/exception-1/action',
      auditEncodedDetail: '/foundation/audit/audit%2F1',
      overrideEncodedDetail: '/foundation/overrides/override%2F1',
      inboundAction: '/inbound-receiving/inbound-1/receiving',
      putawayAction: '/putaway/putaway-1/confirm',
      mobileTaskAction: '/mobile/tasks/task-1/scan',
      labelTemplateAction: '/labels/templates/template-1/preview',
      labelPrintJobAction: '/labels/print-jobs/job-1/reprint',
      cycleCountAction: '/cycle-count/count-1/submit',
      replenishmentAction: '/replenishment/replenishment-1/confirm',
      outboundCreate: '/outbound/new',
      outboundAction: '/outbound/outbound-1/hold',
    });
  });

  it('keeps migrated root pages as list-only entry points without embedded action forms', () => {
    const violations = migratedRootPages.flatMap(([relativePath, listToken]) => {
      const text = readSource(relativePath);
      const missingToken = text.includes(listToken)
        ? []
        : [`${relativePath}: missing ${listToken}`];
      const actionTokens = rootPageActionFormTokens
        .filter((token) => token.test(text))
        .map((token) => `${relativePath}: embedded action token ${token.source}`);
      return [...missingToken, ...actionTokens];
    });

    expect(violations).toEqual([]);
  });

  it('keeps representative detail/action pages in dedicated files with detail shell boundaries', () => {
    const violations = representativeDetailPages.flatMap((relativePath) => {
      if (!sourceExists(relativePath)) return [`${relativePath}: missing detail/action page`];
      const text = readSource(relativePath);
      return text.includes('DetailPageShell') ||
        text.includes('ActionPanel') ||
        text.includes('useParams')
        ? []
        : [`${relativePath}: missing DetailPageShell, ActionPanel or route params`];
    });

    expect(violations).toEqual([]);
  });

  it('keeps migrated list defaults at PageSize 50 and caps PageSize at 100', () => {
    const violations = pageSizeGuardrailSources.flatMap(
      ([relativePath, defaultPattern, maxPattern]) => {
        const text = readSource(relativePath);
        return [
          ...(defaultPattern.test(text) ? [] : [`${relativePath}: missing default PageSize 50`]),
          ...(maxPattern.test(text) ? [] : [`${relativePath}: missing max PageSize 100`]),
        ];
      },
    );

    expect(violations).toEqual([]);
  });

  it('does not add shipping milestones to production InventoryStatus code', () => {
    const forbiddenStatusPattern = /\b(SHIPPED|GATE_OUT|GOODS_ISSUE_POSTED)\b/;
    const productionFiles = collectSourceFiles('Modules')
      .concat(collectSourceFiles('App'))
      .filter((path) => !path.endsWith('.test.ts') && !path.endsWith('.test.tsx'));
    const violations = productionFiles.filter((path) =>
      forbiddenStatusPattern.test(readSource(path)),
    );

    expect(violations).toEqual([]);
  });

  it('keeps placeholder-only operational routes out of router registration and sidebar navigation', () => {
    const appRouter = readSource('App/Router/AppRouter.tsx');
    const sidebar = readSource('App/Layouts/Components/Sidebar.tsx');
    const violations = placeholderOnlyOperationalRouteRefs.flatMap((routeRef) => [
      ...(appRouter.includes(routeRef) ? [`AppRouter registers placeholder ${routeRef}`] : []),
      ...(sidebar.includes(routeRef) ? [`Sidebar exposes placeholder ${routeRef}`] : []),
    ]);

    expect(violations).toEqual([]);
  });

  it('keeps Presentation away from HttpClient and Infrastructure adapters', () => {
    const presentationFiles = collectSourceFiles('Modules').filter(
      (path) =>
        path.includes('/Presentation/') &&
        !path.endsWith('.test.ts') &&
        !path.endsWith('.test.tsx'),
    );
    const forbiddenImports =
      /from\s+['"]@modules\/[^'"]+\/Infrastructure\/(Api|Dtos|Mappers|Repositories)|from\s+['"]@shared\/Services\/Http\/ApiClient|from\s+['"]axios['"]/;
    const violations = presentationFiles.filter((path) => forbiddenImports.test(readSource(path)));

    expect(violations).toEqual([]);
  });
});
