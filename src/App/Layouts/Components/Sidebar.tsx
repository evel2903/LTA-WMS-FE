import { useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import {
  AlertTriangle,
  Boxes,
  Building2,
  CheckCheck,
  ChevronDown,
  ClipboardCheck,
  History,
  LayoutDashboard,
  Layers,
  MapPinned,
  Network,
  Package,
  PackageCheck,
  PackageOpen,
  PackagePlus,
  PackageSearch,
  Ruler,
  Send,
  ShieldAlert,
  ShieldCheck,
  ShoppingCart,
  SlidersHorizontal,
  Smartphone,
  Tags,
  Users,
  Warehouse,
} from 'lucide-react';

import { ROUTES } from '@app/Config/Routes';
import { cn } from '@shared/Utils/Cn';

type IconType = typeof LayoutDashboard;

interface NavLeaf {
  label: string;
  to: string;
  icon: IconType;
}

interface NavGroup {
  label: string;
  icon: IconType;
  children: NavLeaf[];
}

type NavEntry = NavLeaf | NavGroup;

const isGroup = (entry: NavEntry): entry is NavGroup => 'children' in entry;

/** Navigation registry. Add a leaf to the relevant group; add a module group here. */
const NAV_ENTRIES: NavEntry[] = [
  { label: 'Dashboard', to: ROUTES.DASHBOARD, icon: LayoutDashboard },
  { label: 'Inventory', to: ROUTES.INVENTORY.ROOT, icon: Boxes },
  {
    label: 'Foundation',
    icon: Layers,
    children: [
      { label: 'Foundation Overview', to: ROUTES.FOUNDATION.ROOT, icon: Layers },
      { label: 'Site & Location Tree', to: ROUTES.FOUNDATION.LOCATIONS, icon: MapPinned },
      {
        label: 'Location Profiles',
        to: ROUTES.FOUNDATION.LOCATION_PROFILES,
        icon: SlidersHorizontal,
      },
      { label: 'Owner Master', to: ROUTES.FOUNDATION.MASTER_DATA.OWNERS, icon: Building2 },
      { label: 'UOM Master', to: ROUTES.FOUNDATION.MASTER_DATA.UOMS, icon: Ruler },
      { label: 'SKU Master', to: ROUTES.FOUNDATION.MASTER_DATA.SKUS, icon: Package },
      { label: 'Partner Master', to: ROUTES.FOUNDATION.MASTER_DATA.PARTNERS, icon: Users },
      {
        label: 'Warehouse Profiles',
        to: ROUTES.FOUNDATION.WAREHOUSE_PROFILES,
        icon: SlidersHorizontal,
      },
      { label: 'Rule Matrix', to: ROUTES.FOUNDATION.RULE_MATRIX, icon: Network },
      { label: 'Roles & Permissions', to: ROUTES.FOUNDATION.ACCESS.ROLES, icon: ShieldCheck },
      { label: 'Users & Assignments', to: ROUTES.FOUNDATION.ACCESS.USERS, icon: Users },
      { label: 'Audit Log', to: ROUTES.FOUNDATION.AUDIT, icon: History },
      { label: 'Exception Queue', to: ROUTES.FOUNDATION.EXCEPTIONS, icon: AlertTriangle },
      { label: 'Approval Queue', to: ROUTES.FOUNDATION.APPROVALS, icon: CheckCheck },
      { label: 'Override Log', to: ROUTES.FOUNDATION.OVERRIDES, icon: ShieldAlert },
      {
        label: 'Control & Validation',
        to: ROUTES.FOUNDATION.CONTROL_CATALOG,
        icon: ClipboardCheck,
      },
      { label: 'Reason Codes', to: ROUTES.FOUNDATION.REASON_CODES, icon: Tags },
      { label: 'Inventory Status', to: ROUTES.FOUNDATION.INVENTORY_STATUS, icon: PackageSearch },
    ],
  },
  {
    label: 'Operations',
    icon: Warehouse,
    children: [
      { label: 'Inbound', to: ROUTES.INBOUND.ROOT, icon: PackageOpen },
      { label: 'Putaway', to: ROUTES.PUTAWAY.ROOT, icon: PackageCheck },
      { label: 'Replenishment', to: ROUTES.REPLENISHMENT.ROOT, icon: PackagePlus },
      { label: 'Outbound', to: ROUTES.OUTBOUND.ROOT, icon: ShoppingCart },
      { label: 'Packing', to: ROUTES.PACKING.ROOT, icon: PackageCheck },
      { label: 'Shipping', to: ROUTES.SHIPPING.ROOT, icon: Send },
      { label: 'Integration', to: ROUTES.INTEGRATION.ROOT, icon: Network },
      { label: 'Mobile Tasks', to: ROUTES.MOBILE.TASKS, icon: Smartphone },
      { label: 'Labels & Print Jobs', to: ROUTES.LABELS.ROOT, icon: Tags },
      { label: 'Cycle Count', to: ROUTES.CYCLE_COUNT.ROOT, icon: ClipboardCheck },
    ],
  },
];

const leafLinkClass = ({ isActive }: { isActive: boolean }) =>
  cn(
    'flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors',
    isActive
      ? 'bg-sidebar-accent text-sidebar-accent-foreground'
      : 'text-muted-foreground hover:bg-sidebar-accent/60 hover:text-sidebar-foreground',
  );

function NavGroupItem({ group, defaultOpen }: { group: NavGroup; defaultOpen: boolean }) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div>
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
        className={cn(
          'flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors',
          'text-muted-foreground hover:bg-sidebar-accent/60 hover:text-sidebar-foreground',
        )}
      >
        <group.icon className="size-4" />
        <span className="flex-1 text-left">{group.label}</span>
        <ChevronDown className={cn('size-4 transition-transform', open ? 'rotate-180' : '')} />
      </button>
      {open && (
        <div className="border-sidebar-border mt-1 ml-4 space-y-1 border-l pl-2">
          {group.children.map(({ label, to, icon: Icon }) => (
            <NavLink key={to} to={to} end={to === ROUTES.FOUNDATION.ROOT} className={leafLinkClass}>
              <Icon className="size-4" />
              {label}
            </NavLink>
          ))}
        </div>
      )}
    </div>
  );
}

export function Sidebar() {
  const { pathname } = useLocation();

  return (
    <aside className="bg-sidebar text-sidebar-foreground hidden w-64 shrink-0 flex-col border-r md:flex">
      <div className="flex h-14 items-center gap-2 border-b px-6 font-semibold">
        <Warehouse className="size-5" />
        LTA-WMS
      </div>
      <nav className="flex-1 space-y-1 overflow-y-auto p-3">
        {NAV_ENTRIES.map((entry) =>
          isGroup(entry) ? (
            <NavGroupItem
              key={entry.label}
              group={entry}
              defaultOpen={entry.children.some((child) => pathname.startsWith(child.to))}
            />
          ) : (
            <NavLink
              key={entry.to}
              to={entry.to}
              end={entry.to === ROUTES.DASHBOARD}
              className={leafLinkClass}
            >
              <entry.icon className="size-4" />
              {entry.label}
            </NavLink>
          ),
        )}
      </nav>
    </aside>
  );
}
