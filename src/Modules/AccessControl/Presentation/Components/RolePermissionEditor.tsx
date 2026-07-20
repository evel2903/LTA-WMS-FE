import { useMemo, useState } from 'react';
import { Lock } from 'lucide-react';

import { Alert, AlertDescription } from '@shared/Components/Reui/alert';
import { Input } from '@shared/Components/Ui/Input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@shared/Components/Ui/Table';
import {
  bulkSetGrantCells,
  deriveEditableCellState,
  toggleGrantCell,
} from '@modules/AccessControl/Application/UseCases/DeriveEditableCellState';
import type { PermissionMatrix } from '@modules/AccessControl/Application/UseCases/BuildPermissionMatrix';
import { actionLabel, objectTypeLabel } from '@modules/AccessControl/Presentation/Constants/AccessControlDisplayText';

/** Canonical 9-action column order (BE `ActionCode` enum order). */
const ACTION_CODES = ['Create', 'Read', 'Update', 'DeleteCancel', 'Approve', 'Override', 'Unlock', 'Reprint', 'Adjust'];

const FAMILY_GROUPS: { label: string; objectTypes: string[] }[] = [
  {
    label: 'Dữ liệu nền tảng',
    objectTypes: [
      'Site',
      'Warehouse',
      'Zone',
      'Location',
      'LocationProfile',
      'Owner',
      'SKU',
      'UOM',
      'ItemCoverage',
      'InventoryStatus',
      'WarehouseProfile',
      'Rule',
      'Partner',
    ],
  },
  {
    label: 'Quản trị',
    objectTypes: [
      'Role',
      'Permission',
      'UserAssignment',
      'ReasonCode',
      'ApprovalRequest',
      'OverrideLog',
      'AuditLog',
      'ExceptionCase',
    ],
  },
  {
    label: 'Vận hành',
    objectTypes: [
      'CoreFlow',
      'InboundPlan',
      'Receipt',
      'QcTask',
      'PutawayTask',
      'InventoryMovement',
      'CycleCount',
      'ReplenishmentTask',
      'OutboundOrder',
      'Allocation',
      'PickTask',
      'Package',
      'Shipment',
      'Load',
      'GoodsIssue',
      'MobileTask',
      'LabelTemplate',
      'PrintJob',
      'IntegrationMessage',
      'DeadLetterMessage',
      'ReconciliationRun',
    ],
  },
];

const LOCK_TOOLTIP: Record<string, string> = {
  'rider-locked': 'Chỉ cấp qua seed hệ thống',
  'read-dependency-locked': 'Tự động cấp kèm hành động khác của đối tượng này',
  'baseline-locked': 'Vai trò hệ thống — không thể thu hồi quyền đã cấp (add-only)',
};

interface RolePermissionEditorProps {
  roleCode: string;
  isSystem: boolean;
  matrix: PermissionMatrix;
  pendingGrants: Set<string>;
  baselineGrants: Set<string>;
  disabled?: boolean;
  onChange: (next: Set<string>) => void;
}

export function RolePermissionEditor({
  roleCode,
  isSystem,
  matrix,
  pendingGrants,
  baselineGrants,
  disabled = false,
  onChange,
}: RolePermissionEditorProps) {
  const [search, setSearch] = useState('');
  const [objectTypeFilter, setObjectTypeFilter] = useState('ALL');
  // `<details open>` as a static JSX literal is uncontrolled: if the DOM's native `open` state
  // ever diverges (e.g. a native toggle), React never re-applies it on later renders, since the
  // prop value never changes across renders from React's point of view. That desync silently
  // collapses `<details>` down to its closed (summary-only) height, which shrinks `main`'s
  // scrollable content and can strand the Save button below the fold with no obvious cause.
  // Driving `open` from real state keeps the DOM and React in sync on every render.
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(FAMILY_GROUPS.map((group) => [group.label, true])),
  );

  const validCellKeys = useMemo(
    () => new Set(matrix.rows.map((row) => `${row.objectType}::${row.action}`)),
    [matrix.rows],
  );

  const searchLower = search.trim().toLowerCase();
  const visibleObjectTypes = matrix.objectTypes.filter((objectType) => {
    if (objectTypeFilter !== 'ALL' && objectType !== objectTypeFilter) return false;
    if (!searchLower) return true;
    return (
      objectType.toLowerCase().includes(searchLower) ||
      objectTypeLabel(objectType).toLowerCase().includes(searchLower)
    );
  });

  function cellState(objectType: string, action: string) {
    return deriveEditableCellState({
      objectType,
      action,
      isValidCatalogCell: validCellKeys.has(`${objectType}::${action}`),
      pendingGrants,
      baselineGrants,
      roleCode,
      isSystem,
      allActions: ACTION_CODES,
    });
  }

  function handleToggle(objectType: string, action: string) {
    onChange(toggleGrantCell(pendingGrants, roleCode, objectType, action));
  }

  function handleBulkRow(objectType: string, checked: boolean) {
    const cells = ACTION_CODES.filter((action) => cellState(objectType, action).kind === 'editable').map(
      (action) => ({ objectType, action }),
    );
    onChange(
      bulkSetGrantCells(pendingGrants, roleCode, cells, checked, {
        allActions: ACTION_CODES,
        isSystem,
        baselineGrants,
      }),
    );
  }

  // Scoped to the CALLER-supplied object types, not `visibleObjectTypes` as a whole -- each
  // group renders its own column checkbox, and must only ever touch its own group's rows
  // (Review Finding: bulk column toggle was leaking into every other accordion group).
  //
  // Deliberately NO `dependencyCleanup` here (unlike `handleBulkRow`) -- a column bulk action
  // is scoped to exactly ONE action across many objects, so it must never reach into a
  // DIFFERENT action's cell (Read) for any of them. Row-wide clear is an unambiguous "wipe
  // everything for this object" signal; a single-action column clear is not (Review Finding,
  // round 7/8: column-clearing the last dependent action was deleting an independently
  // granted Read that predated the whole bulk operation).
  function handleBulkColumn(action: string, checked: boolean, objectTypes: string[]) {
    const cells = objectTypes
      .filter((objectType) => cellState(objectType, action).kind === 'editable')
      .map((objectType) => ({ objectType, action }));
    onChange(bulkSetGrantCells(pendingGrants, roleCode, cells, checked));
  }

  /** Derives the tri-state (all/some/none) + disabled state for a bulk row/column checkbox
   * from its OWN editable cells only — an uncontrolled checkbox otherwise keeps whatever the
   * user last clicked, so a single cell edit can silently desync it from reality and the next
   * click then clears grants instead of selecting them (Review Finding, round 6). */
  function bulkCheckboxState(cellStates: { kind: string; checked: boolean }[]) {
    const editable = cellStates.filter((state) => state.kind === 'editable');
    const checkedCount = editable.filter((state) => state.checked).length;
    return {
      checked: editable.length > 0 && checkedCount === editable.length,
      indeterminate: checkedCount > 0 && checkedCount < editable.length,
      disabled: editable.length === 0,
    };
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end gap-3">
        <label className="grid gap-1 text-sm">
          Tìm đối tượng
          <Input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Nhập tên đối tượng..."
            className="w-56"
          />
        </label>
        <label className="grid gap-1 text-sm">
          Lọc đối tượng
          <select
            className="h-9 rounded-md border bg-transparent px-3 text-sm"
            value={objectTypeFilter}
            onChange={(event) => setObjectTypeFilter(event.target.value)}
          >
            <option value="ALL">Tất cả</option>
            {matrix.objectTypes.map((objectType) => (
              <option key={objectType} value={objectType}>
                {objectTypeLabel(objectType)}
              </option>
            ))}
          </select>
        </label>
      </div>

      {isSystem && (
        <Alert variant="destructive">
          <AlertDescription>
            Vai trò hệ thống — chỉ có thể THÊM quyền, không thể thu hồi quyền đã cấp. Dùng "Khôi phục về mặc định" nếu
            cần đưa quyền về đúng seed gốc.
          </AlertDescription>
        </Alert>
      )}

      {FAMILY_GROUPS.map((group) => {
        const groupObjectTypes = group.objectTypes.filter((objectType) =>
          visibleObjectTypes.includes(objectType),
        );
        if (groupObjectTypes.length === 0) return null;
        return (
          <details
            key={group.label}
            open={openGroups[group.label] ?? true}
            onToggle={(event) => {
              // Read `currentTarget.open` synchronously — the DOM resets `currentTarget` to
              // null once dispatch finishes, and the functional setState updater below can run
              // after that point, so it must close over a plain boolean, not the event itself.
              const isOpen = event.currentTarget.open;
              setOpenGroups((prev) => ({ ...prev, [group.label]: isOpen }));
            }}
            className="rounded-md border bg-card p-3 text-sm"
            data-testid={`permission-group-${group.label}`}
          >
            <summary className="cursor-pointer font-medium">
              {group.label} ({groupObjectTypes.length})
            </summary>
            <div className="mt-3 overflow-x-auto">
              <Table className="min-w-[900px]">
                <TableHeader>
                  <TableRow>
                    <TableHead>Đối tượng</TableHead>
                    {ACTION_CODES.map((action) => {
                      const columnState = bulkCheckboxState(
                        groupObjectTypes.map((objectType) => cellState(objectType, action)),
                      );
                      return (
                        <TableHead key={action} className="text-center">
                          <div className="flex flex-col items-center gap-1">
                            <span>{actionLabel(action)}</span>
                            <input
                              type="checkbox"
                              ref={(element) => {
                                if (element) element.indeterminate = columnState.indeterminate;
                              }}
                              checked={columnState.checked}
                              disabled={disabled || columnState.disabled}
                              aria-label={`Chọn tất cả ${actionLabel(action)}`}
                              title="Tick: chọn tất cả — Bỏ tick: bỏ chọn tất cả cho các ô có thể sửa"
                              onChange={(event) => handleBulkColumn(action, event.target.checked, groupObjectTypes)}
                            />
                          </div>
                        </TableHead>
                      );
                    })}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {groupObjectTypes.map((objectType) => {
                    const rowState = bulkCheckboxState(
                      ACTION_CODES.map((action) => cellState(objectType, action)),
                    );
                    return (
                    <TableRow key={objectType}>
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            ref={(element) => {
                              if (element) element.indeterminate = rowState.indeterminate;
                            }}
                            checked={rowState.checked}
                            disabled={disabled || rowState.disabled}
                            aria-label={`Chọn tất cả ${objectTypeLabel(objectType)}`}
                            title="Tick: chọn tất cả — Bỏ tick: bỏ chọn tất cả cho các ô có thể sửa"
                            onChange={(event) => handleBulkRow(objectType, event.target.checked)}
                          />
                          <span>{objectTypeLabel(objectType)}</span>
                        </div>
                      </TableCell>
                      {ACTION_CODES.map((action) => {
                        const state = cellState(objectType, action);
                        const label = `${objectTypeLabel(objectType)} ${actionLabel(action)}`;
                        return (
                          <TableCell key={action} className="text-center">
                            {state.kind === 'na' ? (
                              <span aria-label={`${label} không áp dụng`} className="text-muted-foreground">
                                —
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1">
                                <input
                                  type="checkbox"
                                  checked={state.checked}
                                  disabled={disabled || state.kind !== 'editable'}
                                  aria-label={label}
                                  title={LOCK_TOOLTIP[state.kind]}
                                  onChange={() => handleToggle(objectType, action)}
                                />
                                {state.kind !== 'editable' ? (
                                  <Lock
                                    aria-hidden="true"
                                    className="text-muted-foreground size-3"
                                    data-testid={`lock-${state.kind}`}
                                  />
                                ) : null}
                              </span>
                            )}
                          </TableCell>
                        );
                      })}
                    </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          </details>
        );
      })}

      {visibleObjectTypes.length === 0 ? (
        <p className="text-muted-foreground text-sm">Không tìm thấy đối tượng phù hợp với bộ lọc.</p>
      ) : null}
    </div>
  );
}
