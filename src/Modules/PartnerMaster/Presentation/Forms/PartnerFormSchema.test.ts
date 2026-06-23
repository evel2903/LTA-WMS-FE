import { describe, expect, it } from 'vitest';

import {
  partnerDeactivateSchema,
  partnerFormSchema,
} from '@modules/PartnerMaster/Presentation/Forms/PartnerFormSchema';

const validPartner = {
  partnerCode: 'SUP-001',
  partnerName: 'Acme Supplier',
  partnerType: 'Supplier' as const,
  status: 'Active' as const,
  sourceSystem: 'SAP',
  externalReference: 'SAP-SUP-001',
  referenceText: 'Legacy reference',
};

describe('Partner form schemas', () => {
  it('requires code, name, type, source system and external reference', () => {
    expect(partnerFormSchema.safeParse(validPartner).success).toBe(true);
    expect(
      partnerFormSchema.safeParse({
        ...validPartner,
        partnerCode: '',
        partnerName: '',
        sourceSystem: '',
        externalReference: '',
      }).success,
    ).toBe(false);
  });

  it('allows only Supplier, Customer, Carrier and active/inactive lifecycle values', () => {
    expect(partnerFormSchema.safeParse({ ...validPartner, partnerType: 'Customer' }).success).toBe(
      true,
    );
    expect(partnerFormSchema.safeParse({ ...validPartner, partnerType: 'Carrier' }).success).toBe(
      true,
    );
    expect(partnerFormSchema.safeParse({ ...validPartner, partnerType: 'Owner' }).success).toBe(
      false,
    );
    expect(partnerFormSchema.safeParse({ ...validPartner, status: 'SHIPPED' }).success).toBe(false);
    expect(partnerFormSchema.safeParse({ ...validPartner, status: 'GATE_OUT' }).success).toBe(false);
    expect(
      partnerFormSchema.safeParse({ ...validPartner, status: 'GOODS_ISSUE_POSTED' }).success,
    ).toBe(false);
  });

  it('requires reason code for deactivate action', () => {
    expect(partnerDeactivateSchema.safeParse({ reasonCode: 'RC-V1-CANCEL' }).success).toBe(true);
    expect(partnerDeactivateSchema.safeParse({ reasonCode: '' }).success).toBe(false);
  });

  it('keeps external reference aligned with backend max length 100', () => {
    expect(
      partnerFormSchema.safeParse({ ...validPartner, externalReference: 'X'.repeat(100) }).success,
    ).toBe(true);
    expect(
      partnerFormSchema.safeParse({ ...validPartner, externalReference: 'X'.repeat(101) }).success,
    ).toBe(false);
  });
});
