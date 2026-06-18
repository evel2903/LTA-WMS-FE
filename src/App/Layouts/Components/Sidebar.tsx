import { NavLink } from 'react-router-dom';
import {
  Boxes,
  ClipboardCheck,
  LayoutDashboard,
  MapPinned,
  PackageCheck,
  PackageOpen,
  Repeat,
  ScrollText,
  Send,
  ShoppingCart,
  SlidersHorizontal,
  Warehouse,
} from 'lucide-react';

import { ROUTES } from '@app/Config/Routes';
import { cn } from '@shared/Utils/Cn';

interface NavItem {
  label: string;
  to: string;
  icon: typeof LayoutDashboard;
}

/** Navigation registry. Adding a module = adding one entry here. */
const NAV_ITEMS: NavItem[] = [
  { label: 'Dashboard', to: ROUTES.DASHBOARD, icon: LayoutDashboard },
  { label: 'Inventory', to: ROUTES.INVENTORY.ROOT, icon: Boxes },
  { label: 'Site & Location Tree', to: ROUTES.FOUNDATION.LOCATIONS, icon: MapPinned },
  { label: 'Warehouse', to: ROUTES.WAREHOUSE.ROOT, icon: Warehouse },
  { label: 'Inbound', to: ROUTES.INBOUND.ROOT, icon: PackageOpen },
  { label: 'Outbound', to: ROUTES.OUTBOUND.ROOT, icon: ShoppingCart },
  { label: 'Picking', to: ROUTES.PICKING.ROOT, icon: PackageCheck },
  { label: 'Packing', to: ROUTES.PACKING.ROOT, icon: PackageCheck },
  { label: 'Shipping', to: ROUTES.SHIPPING.ROOT, icon: Send },
  { label: 'Stock Transfer', to: ROUTES.STOCK_TRANSFER.ROOT, icon: Repeat },
  { label: 'Stock Adjustment', to: ROUTES.STOCK_ADJUSTMENT.ROOT, icon: SlidersHorizontal },
  { label: 'Cycle Count', to: ROUTES.CYCLE_COUNT.ROOT, icon: ClipboardCheck },
  { label: 'Reports', to: ROUTES.REPORTS.ROOT, icon: ScrollText },
];

export function Sidebar() {
  return (
    <aside className="bg-sidebar text-sidebar-foreground hidden w-64 shrink-0 flex-col border-r md:flex">
      <div className="flex h-14 items-center gap-2 border-b px-6 font-semibold">
        <Warehouse className="size-5" />
        LTA-WMS
      </div>
      <nav className="flex-1 space-y-1 overflow-y-auto p-3">
        {NAV_ITEMS.map(({ label, to, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            end={to === ROUTES.DASHBOARD}
            className={({ isActive }) =>
              cn(
                'flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors',
                isActive
                  ? 'bg-sidebar-accent text-sidebar-accent-foreground'
                  : 'text-muted-foreground hover:bg-sidebar-accent/60 hover:text-sidebar-foreground',
              )
            }
          >
            <Icon className="size-4" />
            {label}
          </NavLink>
        ))}
      </nav>
    </aside>
  );
}
