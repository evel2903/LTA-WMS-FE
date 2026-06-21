import { describe, expect, it } from 'vitest';

import {
  inventoryStatusFormSchema,
  type InventoryStatusFormValues,
} from '@modules/InventoryStatus/Presentation/Forms/InventoryStatusFormSchema';

const base: InventoryStatusFormValues = {
  allowsAllocation: true,
  allowsPick: true,
  hold: false,
  isTerminal: false,
  isMilestone: false,
  sortOrder: 10,
  status: 'Active',
  reasonCode: 'RC-MD-UPDATE',
};

describe('inventoryStatusFormSchema', () => {
  it('accepts a valid payload', () => {
    expect(inventoryStatusFormSchema.safeParse(base).success).toBe(true);
  });
  it('requires a non-empty reason code', () => {
    expect(inventoryStatusFormSchema.safeParse({ ...base, reasonCode: '' }).success).toBe(false);
    expect(inventoryStatusFormSchema.safeParse({ ...base, reasonCode: '   ' }).success).toBe(false);
  });
  it('rejects a negative sort order', () => {
    expect(inventoryStatusFormSchema.safeParse({ ...base, sortOrder: -1 }).success).toBe(false);
  });
  it('keeps hold=false as a valid value', () => {
    const parsed = inventoryStatusFormSchema.safeParse({ ...base, hold: false });
    expect(parsed.success).toBe(true);
    if (parsed.success) expect(parsed.data.hold).toBe(false);
  });
});
