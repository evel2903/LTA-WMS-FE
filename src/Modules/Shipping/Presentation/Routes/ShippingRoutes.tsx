import type { RouteObject } from 'react-router-dom';
import { ROUTES } from '@app/Config/Routes';
import {
  ShippingCreatePage,
  ShippingDetailPage,
} from '@modules/Shipping/Presentation/Pages/ShippingDetailPage';
import { ShippingPage } from '@modules/Shipping/Presentation/Pages/ShippingPage';

export const shippingRoutes: RouteObject[] = [
  { path: ROUTES.SHIPPING.ROOT, element: <ShippingPage /> },
  { path: ROUTES.SHIPPING.NEW, element: <ShippingCreatePage /> },
  { path: ROUTES.SHIPPING.DETAIL(), element: <ShippingDetailPage /> },
  { path: ROUTES.SHIPPING.ACTION(), element: <ShippingDetailPage /> },
];
