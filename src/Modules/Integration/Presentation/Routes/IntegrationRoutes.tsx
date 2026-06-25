import type { RouteObject } from 'react-router-dom';
import { ROUTES } from '@app/Config/Routes';
import { IntegrationDeadLetterDetailPage } from '@modules/Integration/Presentation/Pages/IntegrationDeadLetterDetailPage';
import { IntegrationPage } from '@modules/Integration/Presentation/Pages/IntegrationPage';
import { IntegrationReconciliationDetailPage } from '@modules/Integration/Presentation/Pages/IntegrationReconciliationDetailPage';
import { IntegrationReconciliationPage } from '@modules/Integration/Presentation/Pages/IntegrationReconciliationPage';

export const integrationRoutes: RouteObject[] = [
  { path: ROUTES.INTEGRATION.ROOT, element: <IntegrationPage /> },
  { path: ROUTES.INTEGRATION.RECONCILIATION, element: <IntegrationReconciliationPage /> },
  { path: ROUTES.INTEGRATION.RECONCILIATION_DETAIL(), element: <IntegrationReconciliationDetailPage /> },
  { path: ROUTES.INTEGRATION.RECONCILIATION_ACTION(), element: <IntegrationReconciliationDetailPage /> },
  { path: ROUTES.INTEGRATION.DEAD_LETTER_DETAIL(), element: <IntegrationDeadLetterDetailPage /> },
  { path: ROUTES.INTEGRATION.DEAD_LETTER_ACTION(), element: <IntegrationDeadLetterDetailPage /> },
];
