import { describe, expect, it } from 'vitest';

import {
  bulkSetGrantCells,
  deriveEditableCellState,
  toggleGrantCell,
} from '@modules/AccessControl/Application/UseCases/DeriveEditableCellState';
import { matrixCellKey } from '@modules/AccessControl/Application/UseCases/BuildPermissionMatrix';

const ALL_ACTIONS = ['Create', 'Read', 'Update', 'DeleteCancel', 'Approve', 'Override', 'Unlock', 'Reprint', 'Adjust'];

const base = {
  objectType: 'SKU',
  action: 'Update',
  isValidCatalogCell: true,
  pendingGrants: new Set<string>(),
  baselineGrants: new Set<string>(),
  roleCode: 'CUSTOM_ROLE',
  isSystem: false,
  allActions: ALL_ACTIONS,
};

describe('deriveEditableCellState', () => {
  it('returns na for a cell absent from the catalog, regardless of grant state', () => {
    const state = deriveEditableCellState({
      ...base,
      isValidCatalogCell: false,
      pendingGrants: new Set([matrixCellKey('CUSTOM_ROLE', 'Update', 'SKU')]),
    });
    expect(state).toEqual({ kind: 'na', checked: false });
  });

  it('rider-locks Role/Permission write-actions even when never granted', () => {
    const state = deriveEditableCellState({ ...base, objectType: 'Role', action: 'Update' });
    expect(state).toEqual({ kind: 'rider-locked', checked: false });
  });

  it('rider-locks Role/Permission write-actions when currently granted (still not togglable)', () => {
    const pendingGrants = new Set([matrixCellKey('CUSTOM_ROLE', 'Create', 'Permission')]);
    const state = deriveEditableCellState({ ...base, objectType: 'Permission', action: 'Create', pendingGrants });
    expect(state).toEqual({ kind: 'rider-locked', checked: true });
  });

  it('does NOT rider-lock Read:Role / Read:Permission', () => {
    const state = deriveEditableCellState({ ...base, objectType: 'Role', action: 'Read' });
    expect(state.kind).not.toBe('rider-locked');
  });

  it('auto-locks Read when a sibling action for the same objectType is granted (Read itself also granted)', () => {
    const pendingGrants = new Set([
      matrixCellKey('CUSTOM_ROLE', 'Update', 'SKU'),
      matrixCellKey('CUSTOM_ROLE', 'Read', 'SKU'),
    ]);
    const state = deriveEditableCellState({ ...base, action: 'Read', pendingGrants });
    expect(state).toEqual({ kind: 'read-dependency-locked', checked: true });
  });

  it('locks Read truthfully as UNCHECKED when a sibling is granted but Read itself is not (seed exception, Review Decision)', () => {
    // Real case: QC's seed grants Override:OverrideLog without Read:OverrideLog
    // (AccessControlCatalog.ts). The checkbox must not claim Read is granted when it isn't.
    const pendingGrants = new Set([matrixCellKey('CUSTOM_ROLE', 'Update', 'SKU')]);
    const state = deriveEditableCellState({ ...base, action: 'Read', pendingGrants });
    expect(state).toEqual({ kind: 'read-dependency-locked', checked: false });
  });

  it('leaves Read editable when no sibling action for the objectType is granted', () => {
    const state = deriveEditableCellState({ ...base, action: 'Read' });
    expect(state).toEqual({ kind: 'editable', checked: false });
  });

  it('baseline-locks a granted cell for a system role (add-only)', () => {
    const key = matrixCellKey('WMS_ADMIN', 'Update', 'SKU');
    const state = deriveEditableCellState({
      ...base,
      roleCode: 'WMS_ADMIN',
      isSystem: true,
      pendingGrants: new Set([key]),
      baselineGrants: new Set([key]),
    });
    expect(state).toEqual({ kind: 'baseline-locked', checked: true });
  });

  it('leaves a NEWLY ticked cell (this session, not baseline) editable for a system role', () => {
    const key = matrixCellKey('WMS_ADMIN', 'Update', 'SKU');
    const state = deriveEditableCellState({
      ...base,
      roleCode: 'WMS_ADMIN',
      isSystem: true,
      pendingGrants: new Set([key]),
      baselineGrants: new Set(), // not granted at load time
    });
    expect(state).toEqual({ kind: 'editable', checked: true });
  });

  it('is editable and unchecked for a plain not-yet-granted cell on a custom role', () => {
    const state = deriveEditableCellState(base);
    expect(state).toEqual({ kind: 'editable', checked: false });
  });

  it('is editable and checked for a plain granted cell on a custom role', () => {
    const key = matrixCellKey('CUSTOM_ROLE', 'Update', 'SKU');
    const state = deriveEditableCellState({ ...base, pendingGrants: new Set([key]) });
    expect(state).toEqual({ kind: 'editable', checked: true });
  });
});

describe('toggleGrantCell', () => {
  it('grants a non-Read action and auto-adds Read for the same objectType', () => {
    const next = toggleGrantCell(new Set(), 'CUSTOM_ROLE', 'SKU', 'Update');
    expect(next.has(matrixCellKey('CUSTOM_ROLE', 'Update', 'SKU'))).toBe(true);
    expect(next.has(matrixCellKey('CUSTOM_ROLE', 'Read', 'SKU'))).toBe(true);
  });

  it('revokes a non-Read action without touching Read', () => {
    const pendingGrants = new Set([
      matrixCellKey('CUSTOM_ROLE', 'Update', 'SKU'),
      matrixCellKey('CUSTOM_ROLE', 'Read', 'SKU'),
    ]);
    const next = toggleGrantCell(pendingGrants, 'CUSTOM_ROLE', 'SKU', 'Update');
    expect(next.has(matrixCellKey('CUSTOM_ROLE', 'Update', 'SKU'))).toBe(false);
    expect(next.has(matrixCellKey('CUSTOM_ROLE', 'Read', 'SKU'))).toBe(true);
  });

  it('toggles Read directly when nothing forces it (no auto-add loop)', () => {
    const next = toggleGrantCell(new Set(), 'CUSTOM_ROLE', 'SKU', 'Read');
    expect(next.has(matrixCellKey('CUSTOM_ROLE', 'Read', 'SKU'))).toBe(true);
    expect([...next]).toHaveLength(1);
  });

  it('does not mutate the input set', () => {
    const pendingGrants = new Set<string>();
    toggleGrantCell(pendingGrants, 'CUSTOM_ROLE', 'SKU', 'Update');
    expect(pendingGrants.size).toBe(0);
  });
});

describe('bulkSetGrantCells', () => {
  it('grants every listed cell and auto-adds Read once per objectType', () => {
    const next = bulkSetGrantCells(new Set(), 'CUSTOM_ROLE', [
      { objectType: 'SKU', action: 'Update' },
      { objectType: 'SKU', action: 'Create' },
      { objectType: 'Owner', action: 'Update' },
    ], true);
    expect(next.has(matrixCellKey('CUSTOM_ROLE', 'Update', 'SKU'))).toBe(true);
    expect(next.has(matrixCellKey('CUSTOM_ROLE', 'Create', 'SKU'))).toBe(true);
    expect(next.has(matrixCellKey('CUSTOM_ROLE', 'Read', 'SKU'))).toBe(true);
    expect(next.has(matrixCellKey('CUSTOM_ROLE', 'Update', 'Owner'))).toBe(true);
    expect(next.has(matrixCellKey('CUSTOM_ROLE', 'Read', 'Owner'))).toBe(true);
  });

  it('revokes every listed cell', () => {
    const pendingGrants = new Set([
      matrixCellKey('CUSTOM_ROLE', 'Update', 'SKU'),
      matrixCellKey('CUSTOM_ROLE', 'Create', 'SKU'),
      matrixCellKey('CUSTOM_ROLE', 'Read', 'SKU'),
    ]);
    const next = bulkSetGrantCells(
      pendingGrants,
      'CUSTOM_ROLE',
      [
        { objectType: 'SKU', action: 'Update' },
        { objectType: 'SKU', action: 'Create' },
      ],
      false,
    );
    expect(next.has(matrixCellKey('CUSTOM_ROLE', 'Update', 'SKU'))).toBe(false);
    expect(next.has(matrixCellKey('CUSTOM_ROLE', 'Create', 'SKU'))).toBe(false);
    // Read wasn't in the revoke list — bulk revoke doesn't cascade-remove it.
    expect(next.has(matrixCellKey('CUSTOM_ROLE', 'Read', 'SKU'))).toBe(true);
  });

  it('does not mutate the input set', () => {
    const pendingGrants = new Set<string>();
    bulkSetGrantCells(pendingGrants, 'CUSTOM_ROLE', [{ objectType: 'SKU', action: 'Update' }], true);
    expect(pendingGrants.size).toBe(0);
  });
});
