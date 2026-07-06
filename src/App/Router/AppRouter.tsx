import { lazy } from 'react';
import { createBrowserRouter, Navigate, RouterProvider } from 'react-router-dom';

import { ROUTES } from '@app/Config/Routes';
import { GuestRoute } from '@app/Guards/GuestRoute';
import { ProtectedRoute } from '@app/Guards/ProtectedRoute';
import { AuthLayout } from '@app/Layouts/AuthLayout';
import { DashboardLayout } from '@app/Layouts/DashboardLayout';
import { NotFoundPage } from '@app/Router/NotFoundPage';
import { useAuthBootstrap } from '@modules/Auth/Application/UseCases/UseAuthBootstrap';
import { useSessionExpiry } from '@modules/Auth/Application/UseCases/UseSessionExpiry';
import { authRoutes } from '@modules/Auth/Presentation/Routes/AuthRoutes';
import { foundationOverviewRoutes } from '@modules/FoundationOverview/Presentation/Routes/FoundationOverviewRoutes';
import { inventoryRoutes } from '@modules/Inventory/Presentation/Routes/InventoryRoutes';
import { inventoryLookupRoutes } from '@modules/InventoryLookup/Presentation/Routes/InventoryLookupRoutes';
import { catalogRoutes } from '@modules/MasterData/Presentation/Routes/CatalogRoutes';
import { masterDataRoutes } from '@modules/MasterData/Presentation/Routes/MasterDataRoutes';
import { warehouseProfileRoutes } from '@modules/WarehouseProfile/Presentation/Routes/WarehouseProfileRoutes';
import { accessControlRoutes } from '@modules/AccessControl/Presentation/Routes/AccessControlRoutes';
import { complianceRoutes } from '@modules/Compliance/Presentation/Routes/ComplianceRoutes';
import { reasonCodeRoutes } from '@modules/ReasonCode/Presentation/Routes/ReasonCodeRoutes';
import { inventoryStatusRoutes } from '@modules/InventoryStatus/Presentation/Routes/InventoryStatusRoutes';
import { approvalRoutes } from '@modules/Approval/Presentation/Routes/ApprovalRoutes';
import { overrideLogRoutes } from '@modules/OverrideLog/Presentation/Routes/OverrideLogRoutes';
import { controlValidationCatalogRoutes } from '@modules/ControlValidationCatalog/Presentation/Routes/ControlValidationCatalogRoutes';
import { partnerMasterRoutes } from '@modules/PartnerMaster/Presentation/Routes/PartnerMasterRoutes';
import { taskExecutionRoutes } from '@modules/TaskExecution/Presentation/Routes/TaskExecutionRoutes';
import { barcodeLabelRoutes } from '@modules/BarcodeLabel/Presentation/Routes/BarcodeLabelRoutes';
import { inboundRoutes } from '@modules/Inbound/Presentation/Routes/InboundRoutes';
import { putawayRoutes } from '@modules/Putaway/Presentation/Routes/PutawayRoutes';
import { cycleCountRoutes } from '@modules/CycleCount/Presentation/Routes/CycleCountRoutes';
import { replenishmentRoutes } from '@modules/Replenishment/Presentation/Routes/ReplenishmentRoutes';
import { outboundRoutes } from '@modules/Outbound/Presentation/Routes/OutboundRoutes';
import { packingRoutes } from '@modules/Packing/Presentation/Routes/PackingRoutes';
import { shippingRoutes } from '@modules/Shipping/Presentation/Routes/ShippingRoutes';
import { integrationRoutes } from '@modules/Integration/Presentation/Routes/IntegrationRoutes';

const DashboardPage = lazy(() =>
  import('@app/Router/DashboardPage').then((m) => ({ default: m.DashboardPage })),
);

/**
 * The router composes *module-owned* route arrays. Modules never import each
 * other's routes — they are aggregated here only. New module = import its
 * `*Routes` array and drop it into the protected children.
 */
const router = createBrowserRouter([
  {
    path: ROUTES.ROOT,
    element: <Navigate to={ROUTES.DASHBOARD} replace />,
  },
  {
    // Public routes (login, etc.) — redirect away if already signed in.
    element: <GuestRoute />,
    children: [
      {
        element: <AuthLayout />,
        children: authRoutes,
      },
    ],
  },
  {
    // Authenticated application shell.
    element: <ProtectedRoute />,
    children: [
      {
        element: <DashboardLayout />,
        children: [
          { path: ROUTES.DASHBOARD, element: <DashboardPage /> },
          ...inventoryRoutes,
          ...inventoryLookupRoutes,
          ...foundationOverviewRoutes,
          ...masterDataRoutes,
          ...catalogRoutes,
          ...partnerMasterRoutes,
          ...taskExecutionRoutes,
          ...barcodeLabelRoutes,
          ...inboundRoutes,
          ...putawayRoutes,
          ...cycleCountRoutes,
          ...replenishmentRoutes,
          ...outboundRoutes,
          ...packingRoutes,
          ...shippingRoutes,
          ...integrationRoutes,
          ...warehouseProfileRoutes,
          ...accessControlRoutes,
          ...complianceRoutes,
          ...reasonCodeRoutes,
          ...inventoryStatusRoutes,
          ...approvalRoutes,
          ...overrideLogRoutes,
          ...controlValidationCatalogRoutes,
        ],
      },
    ],
  },
  { path: ROUTES.NOT_FOUND, element: <NotFoundPage /> },
]);

export function AppRouter() {
  // Resolve the cookie session once on boot (GET /auth/me).
  useAuthBootstrap();
  // Listen for forced logout dispatched by the HTTP layer on refresh failure.
  useSessionExpiry();
  return <RouterProvider router={router} />;
}
