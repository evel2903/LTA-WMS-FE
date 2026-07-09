import { lazy } from 'react';
import type { RouteObject } from 'react-router-dom';

import { ROUTES } from '@app/Config/Routes';

const SiteLocationTreePage = lazy(() =>
  import('@modules/MasterData/Presentation/Pages/SiteLocationTreePage').then((module) => ({
    default: module.SiteLocationTreePage,
  })),
);

const SiteMasterPage = lazy(() =>
  import('@modules/MasterData/Presentation/Pages/SiteMasterPage').then((module) => ({
    default: module.SiteMasterPage,
  })),
);

const PhysicalStructureCatalogPage = lazy(() =>
  import('@modules/MasterData/Presentation/Pages/PhysicalStructureCatalogPage').then((module) => ({
    default: module.PhysicalStructureCatalogPage,
  })),
);

const LocationProfileCatalogPage = lazy(() =>
  import('@modules/MasterData/Presentation/Pages/LocationProfileCatalogPage').then((module) => ({
    default: module.LocationProfileCatalogPage,
  })),
);

const WarehouseTypeCatalogPage = lazy(() =>
  import('@modules/MasterData/Presentation/Pages/WarehouseTypeCatalogPage').then((module) => ({
    default: module.WarehouseTypeCatalogPage,
  })),
);

const LocationProfileDetailPage = lazy(() =>
  import('@modules/MasterData/Presentation/Pages/LocationProfileDetailPage').then((module) => ({
    default: module.LocationProfileDetailPage,
  })),
);

export const masterDataRoutes: RouteObject[] = [
  { path: ROUTES.FOUNDATION.SITES, element: <SiteMasterPage /> },
  { path: ROUTES.FOUNDATION.LOCATIONS, element: <PhysicalStructureCatalogPage key="warehouses" mode="warehouses" /> },
  { path: ROUTES.FOUNDATION.ZONES, element: <PhysicalStructureCatalogPage key="zones" mode="zones" /> },
  { path: ROUTES.FOUNDATION.PHYSICAL_LOCATIONS, element: <PhysicalStructureCatalogPage key="locations" mode="locations" /> },
  { path: ROUTES.FOUNDATION.LOCATION_MAP(), element: <SiteLocationTreePage mode="detail" /> },
  { path: ROUTES.FOUNDATION.WAREHOUSE_TYPES, element: <WarehouseTypeCatalogPage /> },
  { path: ROUTES.FOUNDATION.LOCATION_PROFILES, element: <LocationProfileCatalogPage /> },
  { path: ROUTES.FOUNDATION.LOCATION_PROFILE_NEW, element: <LocationProfileDetailPage mode="create" /> },
  { path: ROUTES.FOUNDATION.LOCATION_PROFILE_DETAIL(), element: <LocationProfileDetailPage mode="detail" /> },
  { path: ROUTES.FOUNDATION.LOCATION_PROFILE_EDIT(), element: <LocationProfileDetailPage mode="edit" /> },
];
