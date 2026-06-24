import type { RouteObject } from 'react-router-dom';
import { ROUTES } from '@app/Config/Routes';
import {
  OutboundCreatePage,
  OutboundDetailPage,
} from '@modules/Outbound/Presentation/Pages/OutboundDetailPage';
import { OutboundPage } from '@modules/Outbound/Presentation/Pages/OutboundPage';

export const outboundRoutes: RouteObject[] = [
  { path: ROUTES.OUTBOUND.ROOT, element: <OutboundPage /> },
  { path: ROUTES.OUTBOUND.NEW, element: <OutboundCreatePage /> },
  { path: ROUTES.OUTBOUND.DETAIL(), element: <OutboundDetailPage /> },
  { path: ROUTES.OUTBOUND.ACTION(), element: <OutboundDetailPage /> },
];
