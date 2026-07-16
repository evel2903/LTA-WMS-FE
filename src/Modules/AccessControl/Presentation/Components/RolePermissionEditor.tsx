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
    onChange(bulkSetGrantCells(pendingGrants, roleCode, cells, checked));
  }

  function handleBulkColumn(action: string, checked: boolean) {
    const cells = visibleObjectTypes
      .filter((objectType) => cellState(objectType, action).kind === 'editable')
      .map((objectType) => ({ objectType, action }));
    onChange(bulkSetGrantCells(pendingGrants, roleCode, cells, checked));
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
            open
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
                    {ACTION_CODES.map((action) => (
                      <TableHead key={action} className="text-center">
                        <div className="flex flex-col items-center gap-1">
                          <span>{actionLabel(action)}</span>
                          <div className="flex gap-1">
                            <button
                              type="button"
                              disabled={disabled}
                              className="text-xs underline disabled:opacity-50"
                              onClick={() => handleBulkColumn(action, true)}
                            >
                              Tất cả
                            </button>
                            <button
                              type="button"
                              disabled={disabled}
                              className="text-xs underline disabled:opacity-50"
                              onClick={() => handleBulkColumn(action, false)}
                            >
                              Không
                            </button>
                          </div>
                        </div>
                      </TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {groupObjectTypes.map((objectType) => (
                    <TableRow key={objectType}>
                      <TableCell className="font-medium">
                        <div className="flex flex-col gap-1">
                          <span>{objectTypeLabel(objectType)}</span>
                          <div className="flex gap-1">
                            <button
                              type="button"
                              disabled={disabled}
                              className="text-xs underline disabled:opacity-50"
                              onClick={() => handleBulkRow(objectType, true)}
                            >
                              Tất cả
                            </button>
                            <button
                              type="button"
                              disabled={disabled}
                              className="text-xs underline disabled:opacity-50"
                              onClick={() => handleBulkRow(objectType, false)}
                            >
                              Không
                            </button>
                          </div>
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
                  ))}
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

export { ACTION_CODES, FAMILY_GROUPS };
