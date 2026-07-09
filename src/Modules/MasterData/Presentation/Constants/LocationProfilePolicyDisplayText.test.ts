import { describe, expect, it } from 'vitest';

import type { OperationPolicy } from '@modules/MasterData/Domain/Types/LocationProfilePolicy';
import {
  describeCompliancePolicy,
  describeEligibilityPolicy,
  describeMixPolicy,
  describeOperationPolicy,
} from '@modules/MasterData/Presentation/Constants/LocationProfilePolicyDisplayText';

describe('LocationProfilePolicyDisplayText', () => {
  it('[Review][Patch] labels a "boolean-tolerant" string value ("true"/"false") the same as a real boolean, for the keys BE actually enforces that way', () => {
    expect(describeEligibilityPolicy({ putawayBlocked: 'True' })).toEqual([
      { label: 'Chặn putaway (điều kiện sử dụng)', value: 'Có' },
    ]);
    expect(describeOperationPolicy({ putawayBlocked: 'FALSE' })[0]).toEqual({
      label: 'Chặn putaway (vận hành)',
      value: 'Không',
    });
    expect(describeOperationPolicy({ replenishmentAllowed: 'false' })[3]).toEqual({
      label: 'Cho phép châm hàng',
      value: 'Không',
    });
  });

  it('[Review][Patch] a garbage (non "true"/"false") string on a tolerant key still reads as "not configured", not a crash or a silent true', () => {
    expect(describeEligibilityPolicy({ putawayBlocked: 'yes' })).toEqual([
      { label: 'Chặn putaway (điều kiện sử dụng)', value: 'Không cấu hình' },
    ]);
  });

  it('putawayAllowed stays strict (not tolerant of a string) since its BE type is plain boolean, not boolean-tolerant — legacy free-form data could still hold one', () => {
    expect(describeOperationPolicy({ putawayAllowed: 'false' } as unknown as OperationPolicy)[1]).toEqual({
      label: 'Cho phép putaway',
      value: 'Không cấu hình',
    });
  });

  it('distinguishes "not set" ("Không đặt") from real booleans for the tri-state-managed fields', () => {
    expect(describeOperationPolicy({})[1]).toEqual({ label: 'Cho phép putaway', value: 'Không đặt' });
    expect(describeOperationPolicy({})[3]).toEqual({ label: 'Cho phép châm hàng', value: 'Không đặt' });
    expect(describeOperationPolicy({ putawayAllowed: true })[1]).toEqual({ label: 'Cho phép putaway', value: 'Có' });
  });

  it('labels every strict-boolean row correctly for real true/false/unset values', () => {
    expect(describeOperationPolicy({ replenishmentBlocked: true, pickFace: false })).toEqual([
      { label: 'Chặn putaway (vận hành)', value: 'Không cấu hình' },
      { label: 'Cho phép putaway', value: 'Không đặt' },
      { label: 'Chặn châm hàng', value: 'Có' },
      { label: 'Cho phép châm hàng', value: 'Không đặt' },
      { label: 'Là vị trí soạn hàng (pick face)', value: 'Không' },
    ]);
  });

  it('defaults Mix rows to "Cho phép trộn" and text/compliance rows to "Không cấu hình" for an unset legacy policy (AC5)', () => {
    expect(describeMixPolicy({})).toEqual([
      { label: 'Trộn SKU', value: 'Cho phép trộn' },
      { label: 'Trộn chủ hàng', value: 'Cho phép trộn' },
      { label: 'Trộn lô', value: 'Cho phép trộn' },
    ]);
    expect(describeCompliancePolicy({})).toEqual([
      { label: 'Nhóm nhiệt độ yêu cầu', value: 'Không cấu hình' },
      { label: 'Chỉ áp dụng khu ngoại quan', value: 'Không cấu hình' },
    ]);
  });
});
