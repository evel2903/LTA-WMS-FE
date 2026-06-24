import { lazy } from 'react';
import type { RouteObject } from 'react-router-dom';

import { ROUTES } from '@app/Config/Routes';

const PartnerMasterPage = lazy(() =>
  import('@modules/PartnerMaster/Presentation/Pages/PartnerMasterPage').then((module) => ({
    default: module.PartnerMasterPage,
  })),
);

const PartnerMasterDetailPage = lazy(() =>
  import('@modules/PartnerMaster/Presentation/Pages/PartnerMasterDetailPage').then((module) => ({
    default: module.PartnerMasterDetailPage,
  })),
);

export const partnerMasterRoutes: RouteObject[] = [
  { path: ROUTES.FOUNDATION.MASTER_DATA.PARTNERS, element: <PartnerMasterPage /> },
  { path: ROUTES.FOUNDATION.MASTER_DATA.PARTNER_NEW, element: <PartnerMasterDetailPage mode="create" /> },
  { path: ROUTES.FOUNDATION.MASTER_DATA.PARTNER_DETAIL(), element: <PartnerMasterDetailPage mode="detail" /> },
  { path: ROUTES.FOUNDATION.MASTER_DATA.PARTNER_EDIT(), element: <PartnerMasterDetailPage mode="edit" /> },
];
