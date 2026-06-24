import type { RouteObject } from 'react-router-dom';
import { ROUTES } from '@app/Config/Routes';
import { IntegrationDeadLetterDetailPage } from '@modules/Integration/Presentation/Pages/IntegrationDeadLetterDetailPage';
import { IntegrationPage } from '@modules/Integration/Presentation/Pages/IntegrationPage';

export const integrationRoutes: RouteObject[] = [
  { path: ROUTES.INTEGRATION.ROOT, element: <IntegrationPage /> },
  { path: ROUTES.INTEGRATION.DEAD_LETTER_DETAIL(), element: <IntegrationDeadLetterDetailPage /> },
  { path: ROUTES.INTEGRATION.DEAD_LETTER_ACTION(), element: <IntegrationDeadLetterDetailPage /> },
];
