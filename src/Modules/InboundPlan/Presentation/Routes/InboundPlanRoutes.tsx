import { lazy } from 'react';
import type { RouteObject } from 'react-router-dom';

import { ROUTES } from '@app/Config/Routes';

const InboundPlanPage = lazy(() =>
  import('@modules/InboundPlan/Presentation/Pages/InboundPlanPage').then((module) => ({
    default: module.InboundPlanPage,
  })),
);

const InboundPlanCreatePage = lazy(() =>
  import('@modules/InboundPlan/Presentation/Pages/InboundPlanCreatePage').then((module) => ({
    default: module.InboundPlanCreatePage,
  })),
);

const InboundPlanDetailPage = lazy(() =>
  import('@modules/InboundPlan/Presentation/Pages/InboundPlanDetailPage').then((module) => ({
    default: module.InboundPlanDetailPage,
  })),
);

export const inboundPlanRoutes: RouteObject[] = [
  { path: ROUTES.INBOUND_PLAN.ROOT, element: <InboundPlanPage /> },
  { path: ROUTES.INBOUND_PLAN.NEW, element: <InboundPlanCreatePage /> },
  { path: ROUTES.INBOUND_PLAN.DETAIL(), element: <InboundPlanDetailPage /> },
  { path: ROUTES.INBOUND_PLAN.EDIT(), element: <InboundPlanDetailPage /> },
  { path: ROUTES.INBOUND_PLAN.GATE_IN(), element: <InboundPlanDetailPage /> },
];
