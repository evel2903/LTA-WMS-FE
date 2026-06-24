import { lazy } from 'react';
import type { RouteObject } from 'react-router-dom';

import { ROUTES } from '@app/Config/Routes';

const SiteLocationTreePage = lazy(() =>
  import('@modules/MasterData/Presentation/Pages/SiteLocationTreePage').then((module) => ({
    default: module.SiteLocationTreePage,
  })),
);

const LocationProfileCatalogPage = lazy(() =>
  import('@modules/MasterData/Presentation/Pages/LocationProfileCatalogPage').then((module) => ({
    default: module.LocationProfileCatalogPage,
  })),
);

const LocationProfileDetailPage = lazy(() =>
  import('@modules/MasterData/Presentation/Pages/LocationProfileDetailPage').then((module) => ({
    default: module.LocationProfileDetailPage,
  })),
);

export const masterDataRoutes: RouteObject[] = [
  { path: ROUTES.FOUNDATION.LOCATIONS, element: <SiteLocationTreePage /> },
  { path: ROUTES.FOUNDATION.LOCATION_PROFILES, element: <LocationProfileCatalogPage /> },
  { path: ROUTES.FOUNDATION.LOCATION_PROFILE_NEW, element: <LocationProfileDetailPage mode="create" /> },
  { path: ROUTES.FOUNDATION.LOCATION_PROFILE_DETAIL(), element: <LocationProfileDetailPage mode="detail" /> },
  { path: ROUTES.FOUNDATION.LOCATION_PROFILE_EDIT(), element: <LocationProfileDetailPage mode="edit" /> },
];
