import { describe, expect, it } from 'vitest';

import { OverrideLogMapper } from '@modules/OverrideLog/Infrastructure/Mappers/OverrideLogMapper';
import type {
  OverrideLogDto,
  PagedDto,
} from '@modules/OverrideLog/Infrastructure/Dtos/OverrideLogDtos';

const dto: OverrideLogDto = {
  Id: 'ov1',
  RuleId: 'rule-1',
  RuleCode: 'RULE-PUTAWAY-01',
  ActorUserId: 'u1',
  TargetObjectType: 'WarehouseProfile',
  TargetObjectId: 'wp-1',
  TargetObjectCode: 'WP-MAIN',
  Scope: { warehouseId: 'wh-1' },
  ControlMode: 'APPROVAL_REQUIRED',
  Action: 'Override',
  ReasonCodeId: 'rc-1',
  ReasonNote: 'manual override',
  EvidenceRefs: ['doc-1'],
  ApprovalRequestId: 'ar-9',
  BeforeJson: { allowed: false },
  AfterJson: { allowed: true },
  AuditRef: 'audit-7',
  CorrelationId: 'corr-1',
  CreatedAt: '2026-06-21T00:00:00.000Z',
};

describe('OverrideLogMapper', () => {
  it('toPaged maps Items + Meta and null-guards empty', () => {
    const paged: PagedDto<OverrideLogDto> = {
      Items: [dto],
      Meta: { Page: 1, PageSize: 20, TotalItems: 1, TotalPages: 1 },
    };
    const result = OverrideLogMapper.toPaged(paged, (item) => OverrideLogMapper.toOverrideLog(item));
    expect(result.items[0].ruleCode).toBe('RULE-PUTAWAY-01');
    expect(result.totalPages).toBe(1);
    expect(
      OverrideLogMapper.toPaged({} as PagedDto<OverrideLogDto>, (i) => OverrideLogMapper.toOverrideLog(i)).items,
    ).toEqual([]);
  });

  it('toOverrideLog maps every field incl before/after + scope', () => {
    const entity = OverrideLogMapper.toOverrideLog(dto);
    expect(entity.controlMode).toBe('APPROVAL_REQUIRED');
    expect(entity.approvalRequestId).toBe('ar-9');
    expect(entity.beforeJson).toEqual({ allowed: false });
    expect(entity.afterJson).toEqual({ allowed: true });
    expect(entity.scope).toEqual({ warehouseId: 'wh-1' });
    expect(entity.createdAt).toBe('2026-06-21T00:00:00.000Z');
  });
});
