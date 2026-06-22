import { lazy } from 'react';
import type { RouteObject } from 'react-router-dom';

import { ROUTES } from '@app/Config/Routes';

const PartnerMasterPage = lazy(() =>
  import('@modules/PartnerMaster/Presentation/Pages/PartnerMasterPage').then((module) => ({
    default: module.PartnerMasterPage,
  })),
);

export const partnerMasterRoutes: RouteObject[] = [
  { path: ROUTES.FOUNDATION.MASTER_DATA.PARTNERS, element: <PartnerMasterPage /> },
];
