import { matrixCellKey } from '@modules/AccessControl/Application/UseCases/BuildPermissionMatrix';

export type EditableCellKind =
  | 'na'
  | 'rider-locked'
  | 'read-dependency-locked'
  | 'baseline-locked'
  | 'editable';

export interface EditableCellState {
  kind: EditableCellKind;
  checked: boolean;
}

/** Write-action + object pairs that only the seed can grant (Signal 4 rider) — never toggle via the editor. */
const RIDER_ACTIONS = new Set(['Create', 'Update', 'DeleteCancel']);
const RIDER_OBJECT_TYPES = new Set(['Role', 'Permission']);

/**
 * Pure cell-state derivation for the object×action permission editor (RA-04). Priority order
 * matters: N/A > rider-lock (Role/Permission write-actions never grantable, even unticked) >
 * Read auto-prerequisite lock > system-role add-only baseline lock > plain editable.
 */
export function deriveEditableCellState(params: {
  objectType: string;
  action: string;
  isValidCatalogCell: boolean;
  pendingGrants: Set<string>;
  baselineGrants: Set<string>;
  roleCode: string;
  isSystem: boolean;
  allActions: string[];
}): EditableCellState {
  const { objectType, action, isValidCatalogCell, pendingGrants, baselineGrants, roleCode, isSystem, allActions } =
    params;
  const key = matrixCellKey(roleCode, action, objectType);
  const checked = pendingGrants.has(key);

  if (!isValidCatalogCell) return { kind: 'na', checked: false };

  if (RIDER_OBJECT_TYPES.has(objectType) && RIDER_ACTIONS.has(action)) {
    return { kind: 'rider-locked', checked };
  }

  if (action === 'Read') {
    const hasDependentAction = allActions.some(
      (other) => other !== 'Read' && pendingGrants.has(matrixCellKey(roleCode, other, objectType)),
    );
    // Truthful to `pendingGrants` even when locked: a seed exception can grant a write
    // action without its Read counterpart (e.g. QC's Override:OverrideLog) — BE auto-adds
    // Read on save regardless, but the checkbox must not claim it's already granted.
    if (hasDependentAction) return { kind: 'read-dependency-locked', checked };
  }

  if (isSystem && baselineGrants.has(key)) {
    return { kind: 'baseline-locked', checked: true };
  }

  return { kind: 'editable', checked };
}

/** Sets one cell's membership, immutably. Granting a non-Read action auto-adds Read (§4). */
export function setGrantCell(
  pendingGrants: Set<string>,
  roleCode: string,
  objectType: string,
  action: string,
  checked: boolean,
): Set<string> {
  const key = matrixCellKey(roleCode, action, objectType);
  const next = new Set(pendingGrants);
  if (checked) {
    next.add(key);
    if (action !== 'Read') next.add(matrixCellKey(roleCode, 'Read', objectType));
  } else {
    next.delete(key);
  }
  return next;
}

/** Flips one cell's membership, immutably. */
export function toggleGrantCell(
  pendingGrants: Set<string>,
  roleCode: string,
  objectType: string,
  action: string,
): Set<string> {
  const key = matrixCellKey(roleCode, action, objectType);
  return setGrantCell(pendingGrants, roleCode, objectType, action, !pendingGrants.has(key));
}

/** Sets multiple cells to the same checked value in one pass — for bulk row/column toggle. */
export function bulkSetGrantCells(
  pendingGrants: Set<string>,
  roleCode: string,
  cells: { objectType: string; action: string }[],
  checked: boolean,
): Set<string> {
  return cells.reduce(
    (grants, cell) => setGrantCell(grants, roleCode, cell.objectType, cell.action, checked),
    pendingGrants,
  );
}
