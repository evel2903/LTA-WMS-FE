import { describe, expect, it } from 'vitest';

import {
  assignDataScopeFormSchema,
  assignRoleFormSchema,
} from '@modules/AccessControl/Presentation/Forms/AssignmentFormSchema';

describe('assignRoleFormSchema', () => {
  it('accepts a core role code', () => {
    expect(assignRoleFormSchema.safeParse({ roleCode: 'OPERATOR' }).success).toBe(true);
  });
  it('rejects an unknown role code', () => {
    expect(assignRoleFormSchema.safeParse({ roleCode: 'GUEST' }).success).toBe(false);
  });
});

describe('assignDataScopeFormSchema (IncludeAll XOR value)', () => {
  it('accepts IncludeAll with no value', () => {
    const result = assignDataScopeFormSchema.safeParse({
      scopeType: 'WAREHOUSE',
      includeAll: true,
      scopeValueCode: '',
      scopeValueId: '',
    });
    expect(result.success).toBe(true);
  });

  it('accepts a concrete value with IncludeAll off', () => {
    const result = assignDataScopeFormSchema.safeParse({
      scopeType: 'OWNER',
      includeAll: false,
      scopeValueCode: 'OWN-1',
      scopeValueId: '',
    });
    expect(result.success).toBe(true);
  });

  it('rejects IncludeAll together with a value', () => {
    const result = assignDataScopeFormSchema.safeParse({
      scopeType: 'ZONE',
      includeAll: true,
      scopeValueCode: 'Z-1',
      scopeValueId: '',
    });
    expect(result.success).toBe(false);
  });

  it('rejects neither IncludeAll nor a value', () => {
    const result = assignDataScopeFormSchema.safeParse({
      scopeType: 'ZONE',
      includeAll: false,
      scopeValueCode: '',
      scopeValueId: '',
    });
    expect(result.success).toBe(false);
  });
});
