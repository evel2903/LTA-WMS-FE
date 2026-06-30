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
  children: NavChild[];
}

interface NavSection {
  section: string;
}

type NavChild = NavLeaf | NavSection;
type NavEntry = NavLeaf | NavGroup;

const isGroup = (entry: NavEntry): entry is NavGroup => 'children' in entry;
const isSection = (child: NavChild): child is NavSection => 'section' in child;

/** Navigation registry. Add a leaf to the relevant group; add a module group here. */
const NAV_ENTRIES: NavEntry[] = [
  { label: 'Bảng điều khiển', to: ROUTES.DASHBOARD, icon: LayoutDashboard },
  { label: 'Tồn kho', to: ROUTES.INVENTORY.ROOT, icon: Boxes },
  {
    label: 'Nền tảng',
    icon: Layers,
    children: [
      { section: 'Tổng quan' },
      { label: 'Tổng quan nền tảng', to: ROUTES.FOUNDATION.ROOT, icon: Layers },
      { section: 'Cấu trúc vật lý' },
      { label: 'Site', to: ROUTES.FOUNDATION.SITES, icon: Building2 },
      { label: 'Kho', to: ROUTES.FOUNDATION.LOCATIONS, icon: Warehouse },
      { label: 'Zone', to: ROUTES.FOUNDATION.ZONES, icon: Network },
      { label: 'Vị trí vật lý', to: ROUTES.FOUNDATION.PHYSICAL_LOCATIONS, icon: MapPinned },
      { label: 'Loại kho', to: ROUTES.FOUNDATION.WAREHOUSE_TYPES, icon: Warehouse },
      {
        label: 'Hồ sơ vị trí',
        to: ROUTES.FOUNDATION.LOCATION_PROFILES,
        icon: SlidersHorizontal,
      },
      { section: 'Sản phẩm và đóng gói' },
      { label: 'Chủ hàng', to: ROUTES.FOUNDATION.MASTER_DATA.OWNERS, icon: Building2 },
      { label: 'Đơn vị tính', to: ROUTES.FOUNDATION.MASTER_DATA.UOMS, icon: Ruler },
      { label: 'SKU', to: ROUTES.FOUNDATION.MASTER_DATA.SKUS, icon: Package },
      { label: 'Đối tác', to: ROUTES.FOUNDATION.MASTER_DATA.PARTNERS, icon: Users },
      { section: 'Quy tắc và hồ sơ' },
      {
        label: 'Hồ sơ kho',
        to: ROUTES.FOUNDATION.WAREHOUSE_PROFILES,
        icon: SlidersHorizontal,
      },
      { label: 'Ma trận quy tắc', to: ROUTES.FOUNDATION.RULE_MATRIX, icon: Network },
      { section: 'Quản trị' },
      { label: 'Vai trò và quyền', to: ROUTES.FOUNDATION.ACCESS.ROLES, icon: ShieldCheck },
      { label: 'Người dùng và phân quyền', to: ROUTES.FOUNDATION.ACCESS.USERS, icon: Users },
      { label: 'Nhật ký kiểm toán', to: ROUTES.FOUNDATION.AUDIT, icon: History },
      { label: 'Hàng đợi ngoại lệ', to: ROUTES.FOUNDATION.EXCEPTIONS, icon: AlertTriangle },
      { label: 'Hàng đợi phê duyệt', to: ROUTES.FOUNDATION.APPROVALS, icon: CheckCheck },
      { label: 'Nhật ký ghi đè', to: ROUTES.FOUNDATION.OVERRIDES, icon: ShieldAlert },
      {
        label: 'Kiểm soát xác thực',
        to: ROUTES.FOUNDATION.CONTROL_CATALOG,
        icon: ClipboardCheck,
      },
      { label: 'Mã lý do', to: ROUTES.FOUNDATION.REASON_CODES, icon: Tags },
      { label: 'Trạng thái tồn kho', to: ROUTES.FOUNDATION.INVENTORY_STATUS, icon: PackageSearch },
    ],
  },
  {
    label: 'Vận hành',
    icon: Warehouse,
    children: [
      { label: 'Nhập kho', to: ROUTES.INBOUND.ROOT, icon: PackageOpen },
      { label: 'Cất hàng', to: ROUTES.PUTAWAY.ROOT, icon: PackageCheck },
      { label: 'Bổ sung hàng', to: ROUTES.REPLENISHMENT.ROOT, icon: PackagePlus },
      { label: 'Xuất kho', to: ROUTES.OUTBOUND.ROOT, icon: ShoppingCart },
      { label: 'Đóng gói', to: ROUTES.PACKING.ROOT, icon: PackageCheck },
      { label: 'Giao hàng', to: ROUTES.SHIPPING.ROOT, icon: Send },
      { label: 'Tích hợp', to: ROUTES.INTEGRATION.ROOT, icon: Network },
      { label: 'Nhiệm vụ di động', to: ROUTES.MOBILE.TASKS, icon: Smartphone },
      { label: 'Nhãn và lệnh in', to: ROUTES.LABELS.ROOT, icon: Tags },
      { label: 'Kiểm kê chu kỳ', to: ROUTES.CYCLE_COUNT.ROOT, icon: ClipboardCheck },
    ],
  },
];

const leafLinkClass = ({ isActive }: { isActive: boolean }) =>
  cn(
    'flex min-h-10 items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors',
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
          'flex min-h-10 w-full items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors',
          'text-muted-foreground hover:bg-sidebar-accent/60 hover:text-sidebar-foreground',
        )}
      >
        <group.icon className="size-4" />
        <span className="flex-1 text-left">{group.label}</span>
        <ChevronDown className={cn('size-4 transition-transform', open ? 'rotate-180' : '')} />
      </button>
      {open && (
        <div className="border-sidebar-border mt-1 ml-4 space-y-1 border-l pl-2">
          {group.children.map((child) =>
            isSection(child) ? (
              <div
                key={child.section}
                className="px-3 pt-3 pb-1 text-[11px] font-semibold uppercase tracking-normal text-muted-foreground"
              >
                {child.section}
              </div>
            ) : (
              <NavLink key={child.to} to={child.to} end={child.to === ROUTES.FOUNDATION.ROOT} className={leafLinkClass}>
                <child.icon className="size-4" />
                {child.label}
              </NavLink>
            ),
          )}
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
              defaultOpen={entry.children.some((child) => !isSection(child) && pathname.startsWith(child.to))}
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
