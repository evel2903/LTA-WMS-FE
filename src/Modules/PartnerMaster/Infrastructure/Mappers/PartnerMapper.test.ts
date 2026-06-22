import { describe, expect, it } from 'vitest';

import type { PartnerDto, PagedPartnerDto } from '@modules/PartnerMaster/Infrastructure/Dtos/PartnerDtos';
import { PartnerMapper } from '@modules/PartnerMaster/Infrastructure/Mappers/PartnerMapper';

const partnerDto: PartnerDto = {
  Id: 'partner-1',
  PartnerCode: 'SUP-001',
  PartnerName: 'Acme Supplier',
  PartnerType: 'Supplier',
  Status: 'Active',
  SourceSystem: 'SAP',
  ExternalReference: 'SAP-SUP-001',
  ReferenceText: 'Legacy supplier reference',
  CreatedAt: '2026-06-22T00:00:00.000Z',
  UpdatedAt: '2026-06-22T00:00:00.000Z',
  CreatedBy: 'admin',
  UpdatedBy: 'admin',
};

describe('PartnerMapper', () => {
  it('maps PascalCase partner DTOs into camelCase domain objects', () => {
    expect(PartnerMapper.toPartner(partnerDto)).toMatchObject({
      id: 'partner-1',
      partnerCode: 'SUP-001',
      partnerName: 'Acme Supplier',
      partnerType: 'Supplier',
      status: 'Active',
      sourceSystem: 'SAP',
      externalReference: 'SAP-SUP-001',
      referenceText: 'Legacy supplier reference',
    });
  });

  it('maps paged envelopes and tolerates null list payloads', () => {
    const page: PagedPartnerDto = {
      Items: [partnerDto],
      Meta: { Page: 2, PageSize: 50, TotalItems: 51, TotalPages: 2 },
    };

    expect(PartnerMapper.toPaged(page)).toEqual({
      items: [expect.objectContaining({ id: 'partner-1' })],
      page: 2,
      pageSize: 50,
      totalItems: 51,
      totalPages: 2,
    });
    expect(PartnerMapper.toPaged(null as unknown as PagedPartnerDto)).toEqual({
      items: [],
      page: 1,
      pageSize: 0,
      totalItems: 0,
      totalPages: 0,
    });
  });

  it('builds PascalCase create/update/deactivate payloads and omits nullish optionals', () => {
    expect(
      PartnerMapper.toCreateRequest({
        partnerCode: 'CUS-001',
        partnerName: 'Retail Customer',
        partnerType: 'Customer',
        status: 'Active',
        sourceSystem: 'OMS',
        externalReference: 'OMS-CUS-001',
        referenceText: null,
      }),
    ).toEqual({
      PartnerCode: 'CUS-001',
      PartnerName: 'Retail Customer',
      PartnerType: 'Customer',
      Status: 'Active',
      SourceSystem: 'OMS',
      ExternalReference: 'OMS-CUS-001',
    });

    expect(
      PartnerMapper.toUpdateRequest({
        partnerName: 'Carrier Updated',
        status: 'Inactive',
        sourceSystem: undefined,
        referenceText: 'Keep EDI alias',
      }),
    ).toEqual({
      PartnerName: 'Carrier Updated',
      Status: 'Inactive',
      ReferenceText: 'Keep EDI alias',
    });

    expect(PartnerMapper.toDeactivateRequest({ reasonCode: 'RC-V1-CANCEL' })).toEqual({
      ReasonCode: 'RC-V1-CANCEL',
    });
  });
});
