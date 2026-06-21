import { lazy } from 'react';

import { ROUTES } from '@app/Config/Routes';

const ControlValidationCatalogPage = lazy(() =>
  import('@modules/ControlValidationCatalog/Presentation/Pages/ControlValidationCatalogPage').then(
    (module) => ({
      default: module.ControlValidationCatalogPage,
    }),
  ),
);

export const controlValidationCatalogRoutes = [
  { path: ROUTES.FOUNDATION.CONTROL_CATALOG, element: <ControlValidationCatalogPage /> },
];
