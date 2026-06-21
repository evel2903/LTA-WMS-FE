import { describe, expect, it } from 'vitest';

import type { LocationProfile } from '@modules/MasterData/Domain/Types/MasterDataEntities';
import {
  locationProfileFormSchema,
  locationProfileToFormValues,
  toCreateLocationProfileInput,
  toUpdateLocationProfileInput,
} from '@modules/MasterData/Presentation/Forms/LocationProfileFormSchema';

const validValues = {
  profileCode: 'BIN-STD',
  profileName: 'Standard Bin',
  locationType: 'Bin',
  version: 1,
  status: 'Active',
  capacityPolicyJson: '{ "maxQty": 100 }',
  eligibilityPolicyJson: '{}',
  mixPolicyJson: '{}',
  compliancePolicyJson: '{}',
  operationPolicyJson: '{}',
  reasonCode: 'RC-MD-UPDATE',
  sourceSystem: '',
  referenceId: '',
} as const;

const profile: LocationProfile = {
  id: 'profile-1',
  profileCode: 'BIN-STD',
  profileName: 'Standard Bin',
  locationType: 'Bin',
  version: 3,
  status: 'Active',
  capacityPolicy: { maxQty: 100 },
  eligibilityPolicy: { pickable: true },
  mixPolicy: { sku: 'SingleSku' },
  compliancePolicy: { bondedAllowed: false },
  operationPolicy: { pickSequenceRequired: true },
  sourceSystem: null,
  referenceId: null,
  createdAt: '2026-06-21T00:00:00.000Z',
  updatedAt: '2026-06-21T00:00:00.000Z',
  createdBy: null,
  updatedBy: null,
};

describe('LocationProfileFormSchema', () => {
  it('validates five JSON policy sections as objects', () => {
    expect(locationProfileFormSchema.safeParse(validValues).success).toBe(true);
    expect(
      locationProfileFormSchema.safeParse({
        ...validValues,
        capacityPolicyJson: '[',
      }).success,
    ).toBe(false);
    expect(
      locationProfileFormSchema.safeParse({
        ...validValues,
        capacityPolicyJson: '[]',
      }).success,
    ).toBe(false);
  });

  it('maps create/update form values to backend-safe domain input', () => {
    const parsed = locationProfileFormSchema.parse(validValues);

    expect(toCreateLocationProfileInput(parsed)).toMatchObject({
      profileCode: 'BIN-STD',
      profileName: 'Standard Bin',
      locationType: 'Bin',
      status: 'Active',
      capacityPolicy: { maxQty: 100 },
      reasonCode: 'RC-MD-UPDATE',
    });
    expect(toUpdateLocationProfileInput({ ...parsed, status: 'Inactive' })).toMatchObject({
      version: 1,
      status: 'Inactive',
      capacityPolicy: { maxQty: 100 },
    });
  });

  it('hydrates edit defaults from the selected profile', () => {
    const values = locationProfileToFormValues(profile);

    expect(values.profileCode).toBe('BIN-STD');
    expect(values.version).toBe(3);
    expect(values.capacityPolicyJson).toContain('"maxQty": 100');
    expect(values.reasonCode).toBe('');
  });
});
