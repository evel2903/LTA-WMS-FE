import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { extname, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

const srcRoot = fileURLToPath(new URL('../../', import.meta.url));
const sourceExtensions = new Set(['.ts', '.tsx']);

interface PlaceholderSurface {
  label: string;
  routeObjectRef: string;
  routeRef: string;
  path: string;
  queryNamespaceRef: string;
  moduleFolder: string;
}

function sourcePath(relativePath: string): string {
  return resolve(srcRoot, relativePath);
}

function readSource(relativePath: string): string {
  return readFileSync(sourcePath(relativePath), 'utf8');
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

const placeholderOnlySurfaces: PlaceholderSurface[] = [
  {
    label: 'Warehouse',
    routeObjectRef: 'ROUTES.WAREHOUSE',
    routeRef: 'ROUTES.WAREHOUSE.ROOT',
    path: '/warehouse',
    queryNamespaceRef: 'QUERY_NAMESPACES.WAREHOUSE',
    moduleFolder: 'Modules/Warehouse',
  },
  {
    label: 'Picking',
    routeObjectRef: 'ROUTES.PICKING',
    routeRef: 'ROUTES.PICKING.ROOT',
    path: '/picking',
    queryNamespaceRef: 'QUERY_NAMESPACES.PICKING',
    moduleFolder: 'Modules/Picking',
  },
  {
    label: 'Stock Transfer',
    routeObjectRef: 'ROUTES.STOCK_TRANSFER',
    routeRef: 'ROUTES.STOCK_TRANSFER.ROOT',
    path: '/stock-transfer',
    queryNamespaceRef: 'QUERY_NAMESPACES.STOCK_TRANSFER',
    moduleFolder: 'Modules/StockTransfer',
  },
  {
    label: 'Stock Adjustment',
    routeObjectRef: 'ROUTES.STOCK_ADJUSTMENT',
    routeRef: 'ROUTES.STOCK_ADJUSTMENT.ROOT',
    path: '/stock-adjustment',
    queryNamespaceRef: 'QUERY_NAMESPACES.STOCK_ADJUSTMENT',
    moduleFolder: 'Modules/StockAdjustment',
  },
  {
    label: 'Reports',
    routeObjectRef: 'ROUTES.REPORTS',
    routeRef: 'ROUTES.REPORTS.ROOT',
    path: '/reports',
    queryNamespaceRef: 'QUERY_NAMESPACES.REPORTS',
    moduleFolder: 'Modules/Reports',
  },
] as const;

const implementedRouteRegistrations = [
  'inboundRoutes',
  'putawayRoutes',
  'replenishmentRoutes',
  'outboundRoutes',
  'packingRoutes',
  'shippingRoutes',
  'integrationRoutes',
  'taskExecutionRoutes',
  'barcodeLabelRoutes',
  'cycleCountRoutes',
  'partnerMasterRoutes',
  'warehouseProfileRoutes',
  'accessControlRoutes',
  'complianceRoutes',
  'reasonCodeRoutes',
  'inventoryStatusRoutes',
  'approvalRoutes',
  'overrideLogRoutes',
  'controlValidationCatalogRoutes',
] as const;

const implementedSidebarRouteRefs = [
  'ROUTES.INBOUND.ROOT',
  'ROUTES.PUTAWAY.ROOT',
  'ROUTES.REPLENISHMENT.ROOT',
  'ROUTES.OUTBOUND.ROOT',
  'ROUTES.PACKING.ROOT',
  'ROUTES.SHIPPING.ROOT',
  'ROUTES.INTEGRATION.ROOT',
  'ROUTES.MOBILE.TASKS',
  'ROUTES.LABELS.ROOT',
  'ROUTES.CYCLE_COUNT.ROOT',
  'ROUTES.FOUNDATION.MASTER_DATA.PARTNERS',
  'ROUTES.FOUNDATION.WAREHOUSE_PROFILES',
  'ROUTES.FOUNDATION.ACCESS.ROLES',
  'ROUTES.FOUNDATION.AUDIT',
  'ROUTES.FOUNDATION.EXCEPTIONS',
  'ROUTES.FOUNDATION.APPROVALS',
  'ROUTES.FOUNDATION.OVERRIDES',
  'ROUTES.FOUNDATION.CONTROL_CATALOG',
  'ROUTES.FOUNDATION.REASON_CODES',
  'ROUTES.FOUNDATION.INVENTORY_STATUS',
] as const;

const allowedPlaceholderFiles = new Set([
  'App/Config/Routes.ts',
  'Shared/Constants/QueryKeys.ts',
  'App/Config/V1UxListDetailGuardrails.test.ts',
  'App/Config/PlaceholderRouteGovernance.test.ts',
  'App/Layouts/Components/Sidebar.test.tsx',
]);

describe('V1-HB placeholder route/constants governance', () => {
  function escapeRegExp(value: string): string {
    return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  function containsRouteObjectRef(text: string, routeObjectRef: string): boolean {
    return new RegExp(`${escapeRegExp(routeObjectRef)}\\b`).test(text);
  }

  function containsRouteLiteral(text: string, routePath: string): boolean {
    return new RegExp(`['"\`]${escapeRegExp(routePath)}(?:['"\`/])`).test(text);
  }

  function containsExactNamespaceRef(text: string, namespaceRef: string): boolean {
    return new RegExp(`${escapeRegExp(namespaceRef)}\\b`).test(text);
  }

  it('keeps implemented V1 route modules registered and visible in sidebar', () => {
    const appRouter = readSource('App/Router/AppRouter.tsx');
    const sidebar = readSource('App/Layouts/Components/Sidebar.tsx');

    const missingRegisteredRoutes = implementedRouteRegistrations.filter(
      (routeArray) => !appRouter.includes(`...${routeArray}`),
    );
    const missingSidebarRoutes = implementedSidebarRouteRefs.filter(
      (routeRef) => !sidebar.includes(routeRef),
    );

    expect({ missingRegisteredRoutes, missingSidebarRoutes }).toEqual({
      missingRegisteredRoutes: [],
      missingSidebarRoutes: [],
    });
  });

  it('keeps placeholder-only routes out of router, sidebar, and module folders', () => {
    const appRouter = readSource('App/Router/AppRouter.tsx');
    const sidebar = readSource('App/Layouts/Components/Sidebar.tsx');

    const violations = placeholderOnlySurfaces.flatMap((surface) => [
      ...(containsRouteObjectRef(appRouter, surface.routeObjectRef)
        ? [`AppRouter references placeholder route object ${surface.routeObjectRef}`]
        : []),
      ...(appRouter.includes(surface.routeRef)
        ? [`AppRouter registers placeholder route ref ${surface.routeRef}`]
        : []),
      ...(containsRouteLiteral(appRouter, surface.path)
        ? [`AppRouter registers placeholder literal ${surface.path}`]
        : []),
      ...(containsRouteObjectRef(sidebar, surface.routeObjectRef)
        ? [`Sidebar references placeholder route object ${surface.routeObjectRef}`]
        : []),
      ...(sidebar.includes(surface.routeRef)
        ? [`Sidebar exposes placeholder route ref ${surface.routeRef}`]
        : []),
      ...(containsRouteLiteral(sidebar, surface.path)
        ? [`Sidebar exposes placeholder literal ${surface.path}`]
        : []),
      ...(sidebar.includes(`label: '${surface.label}'`) ||
      sidebar.includes(`label: "${surface.label}"`)
        ? [`Sidebar exposes placeholder label ${surface.label}`]
        : []),
      ...(existsSync(sourcePath(surface.moduleFolder))
        ? [`Placeholder module folder exists without a V1-HB-04 scope update: ${surface.moduleFolder}`]
        : []),
    ]);

    expect(violations).toEqual([]);
  });

  it('keeps placeholder route and query constants constant-only until a real story opens them', () => {
    const productionFiles = [
      ...collectSourceFiles('App'),
      ...collectSourceFiles('Modules'),
      ...collectSourceFiles('Shared'),
    ].filter((path) => !allowedPlaceholderFiles.has(path));

    const violations = productionFiles.flatMap((path) => {
      const text = readSource(path);
      return placeholderOnlySurfaces.flatMap((surface) => [
        ...(containsRouteObjectRef(text, surface.routeObjectRef)
          ? [`${path}: uses placeholder route object ${surface.routeObjectRef}`]
          : []),
        ...(text.includes(surface.routeRef)
          ? [`${path}: uses placeholder route ref ${surface.routeRef}`]
          : []),
        ...(containsRouteLiteral(text, surface.path)
          ? [`${path}: uses placeholder route literal ${surface.path}`]
          : []),
        ...(containsExactNamespaceRef(text, surface.queryNamespaceRef)
          ? [`${path}: uses placeholder query namespace ref ${surface.queryNamespaceRef}`]
          : []),
      ]);
    });

    expect(violations).toEqual([]);
  });
});
