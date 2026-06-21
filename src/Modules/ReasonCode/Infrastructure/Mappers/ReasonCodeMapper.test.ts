import { describe, expect, it } from 'vitest';

import { ReasonCodeMapper } from '@modules/ReasonCode/Infrastructure/Mappers/ReasonCodeMapper';
import type { PagedDto, ReasonCodeDto } from '@modules/ReasonCode/Infrastructure/Dtos/ReasonCodeDtos';

const dto: ReasonCodeDto = {
  Id: 'r1',
  ReasonCode: 'RC-ADJ-01',
  ReasonGroup: 'INVENTORY_ADJUSTMENT',
  Description: 'Adjust',
  AppliesToActions: ['Adjust'],
  AppliesToObjects: ['InventoryStatus'],
  EvidenceRequired: false,
  ApprovalRequired: false,
  AllowedRoleCodes: null,
  Status: 'ACTIVE',
  Version: 1,
  EffectiveFrom: null,
  EffectiveTo: null,
};

describe('ReasonCodeMapper', () => {
  it('toPaged maps Items + Meta and null-guards empty', () => {
    const paged: PagedDto<ReasonCodeDto> = {
      Items: [dto],
      Meta: { Page: 1, PageSize: 20, TotalItems: 1, TotalPages: 1 },
    };
    const result = ReasonCodeMapper.toPaged(paged, (item) => ReasonCodeMapper.toReasonCode(item));
    expect(result.items[0].reasonCode).toBe('RC-ADJ-01');
    expect(ReasonCodeMapper.toPaged({} as PagedDto<ReasonCodeDto>, (i) => ReasonCodeMapper.toReasonCode(i)).items).toEqual([]);
  });

  it('toReasonCode maps fields incl null allowedRoleCodes', () => {
    const entity = ReasonCodeMapper.toReasonCode(dto);
    expect(entity.appliesToActions).toEqual(['Adjust']);
    expect(entity.allowedRoleCodes).toBeNull();
    expect(entity.status).toBe('ACTIVE');
  });

  it('toCreateRequest strips nullish, keeps EvidenceRequired=false, omits empty roles', () => {
    const body = ReasonCodeMapper.toCreateRequest({
      reasonCode: 'RC-X',
      reasonGroup: 'MANUAL_FIX',
      appliesToActions: ['Update'],
      appliesToObjects: ['SKU'],
      evidenceRequired: false,
      allowedRoleCodes: [],
    });
    expect(body).toEqual({
      ReasonCode: 'RC-X',
      ReasonGroup: 'MANUAL_FIX',
      AppliesToActions: ['Update'],
      AppliesToObjects: ['SKU'],
      EvidenceRequired: false,
    });
    expect('AllowedRoleCodes' in body).toBe(false);
    expect('Description' in body).toBe(false);
  });

  it('toUpdateRequest carries Status and keeps non-empty roles', () => {
    const body = ReasonCodeMapper.toUpdateRequest({ status: 'INACTIVE', allowedRoleCodes: ['QC'] });
    expect(body).toEqual({ Status: 'INACTIVE', AllowedRoleCodes: ['QC'] });
  });

  it('toUpdateRequest sends null to CLEAR blanked optionals (empty = no restriction)', () => {
    const body = ReasonCodeMapper.toUpdateRequest({
      allowedRoleCodes: [],
      description: '',
      effectiveFrom: '',
      effectiveTo: '',
    });
    expect(body).toEqual({
      AllowedRoleCodes: null,
      Description: null,
      EffectiveFrom: null,
      EffectiveTo: null,
    });
  });

  it('toUpdateRequest omits truly untouched (undefined) fields', () => {
    expect(ReasonCodeMapper.toUpdateRequest({ status: 'ACTIVE' })).toEqual({ Status: 'ACTIVE' });
  });
});
