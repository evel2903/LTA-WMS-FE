import { describe, expect, it } from 'vitest';

import { ApprovalMapper } from '@modules/Approval/Infrastructure/Mappers/ApprovalMapper';
import type {
  ApprovalRequestDto,
  PagedDto,
} from '@modules/Approval/Infrastructure/Dtos/ApprovalDtos';

const dto: ApprovalRequestDto = {
  Id: 'ar1',
  RequesterUserId: 'u-req',
  Action: 'Override',
  TargetObjectType: 'WarehouseProfile',
  TargetObjectId: 'wp-1',
  TargetObjectCode: 'WP-MAIN',
  Scope: { warehouseId: 'wh-1' },
  RequestReasonCodeId: 'rc-1',
  RequestReasonNote: 'please',
  EvidenceRefs: null,
  Decision: 'PENDING',
  DecidedByUserId: null,
  DecisionReasonCodeId: null,
  DecisionNote: null,
  DecidedAt: null,
  ReferenceType: 'WarehouseProfile',
  ReferenceId: 'wp-1',
  CreatedAt: '2026-06-21T00:00:00.000Z',
  UpdatedAt: '2026-06-21T00:00:00.000Z',
};

describe('ApprovalMapper', () => {
  it('toPaged maps Items + Meta and null-guards empty', () => {
    const paged: PagedDto<ApprovalRequestDto> = {
      Items: [dto],
      Meta: { Page: 1, PageSize: 20, TotalItems: 1, TotalPages: 1 },
    };
    const result = ApprovalMapper.toPaged(paged, (item) => ApprovalMapper.toApproval(item));
    expect(result.items[0].id).toBe('ar1');
    expect(result.totalPages).toBe(1);
    expect(
      ApprovalMapper.toPaged({} as PagedDto<ApprovalRequestDto>, (i) => ApprovalMapper.toApproval(i)).items,
    ).toEqual([]);
  });

  it('toApproval maps fields incl scope + null decision fields', () => {
    const entity = ApprovalMapper.toApproval(dto);
    expect(entity.requesterUserId).toBe('u-req');
    expect(entity.decision).toBe('PENDING');
    expect(entity.scope).toEqual({ warehouseId: 'wh-1' });
    expect(entity.decidedByUserId).toBeNull();
    expect(entity.referenceId).toBe('wp-1');
  });

  it('toDecideRequest strips null/undefined and omits empty evidence', () => {
    expect(ApprovalMapper.toDecideRequest({ reasonCode: 'RC-APPROVE', reasonNote: 'ok' })).toEqual({
      ReasonCode: 'RC-APPROVE',
      ReasonNote: 'ok',
    });
    // empty evidence array → omitted (never send [])
    expect(ApprovalMapper.toDecideRequest({ reasonCode: 'RC-APPROVE', evidenceRefs: [] })).toEqual({
      ReasonCode: 'RC-APPROVE',
    });
    // a no-reason decision is a valid empty body
    expect(ApprovalMapper.toDecideRequest({})).toEqual({});
    // real evidence survives
    expect(ApprovalMapper.toDecideRequest({ evidenceRefs: ['doc-1'] })).toEqual({
      EvidenceRefs: ['doc-1'],
    });
  });
});
