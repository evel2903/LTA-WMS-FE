import { describe, expect, it } from 'vitest';

import { ComplianceMapper } from '@modules/Compliance/Infrastructure/Mappers/ComplianceMapper';
import type {
  AuditLogDto,
  ExceptionCaseDto,
  PagedDto,
} from '@modules/Compliance/Infrastructure/Dtos/ComplianceDtos';

const auditDto: AuditLogDto = {
  Id: 'a1',
  OccurredAt: '2026-06-21T00:00:00.000Z',
  ActorUserId: 'u1',
  ActorRoleCodes: ['WMS_ADMIN'],
  ActorType: 'USER',
  Action: 'Update',
  ObjectType: 'ExceptionCase',
  ObjectId: 'e1',
  ObjectCode: 'EXC-1',
  BeforeJson: { State: 'DETECTED' },
  AfterJson: { State: 'LOGGED' },
  ReasonCodeId: null,
  ReasonNote: null,
  EvidenceRefs: null,
  ReferenceType: 'ASN',
  ReferenceId: 'asn-9',
  WarehouseId: null,
  OwnerId: null,
  CorrelationId: 'corr-1',
  Result: 'SUCCESS',
};

describe('ComplianceMapper', () => {
  it('toPaged maps Items + Meta and null-guards empty envelope', () => {
    const dto: PagedDto<AuditLogDto> = {
      Items: [auditDto],
      Meta: { Page: 1, PageSize: 20, TotalItems: 1, TotalPages: 1 },
    };
    const result = ComplianceMapper.toPaged(dto, (item) => ComplianceMapper.toAuditLog(item));
    expect(result.items).toHaveLength(1);
    expect(result.totalItems).toBe(1);

    const empty = ComplianceMapper.toPaged({} as PagedDto<AuditLogDto>, (item) =>
      ComplianceMapper.toAuditLog(item),
    );
    expect(empty.items).toEqual([]);
  });

  it('toAuditLog maps before/after + camelCase fields', () => {
    const entry = ComplianceMapper.toAuditLog(auditDto);
    expect(entry.action).toBe('Update');
    expect(entry.beforeJson).toEqual({ State: 'DETECTED' });
    expect(entry.afterJson).toEqual({ State: 'LOGGED' });
    expect(entry.result).toBe('SUCCESS');
  });

  it('toException maps lifecycle fields', () => {
    const dto = {
      Id: 'e1',
      ExceptionType: 'CTRL-EX-01',
      State: 'ASSIGNED',
      SubStatus: null,
      Outcome: null,
      ReferenceType: 'ASN',
      ReferenceId: 'asn-9',
      WarehouseId: null,
      OwnerId: null,
      ReasonCodeId: null,
      AssignedToUserId: 'u2',
      AssignedRoleId: null,
      DetectedRuleId: null,
      ApprovalRequestId: null,
      Severity: 'HIGH',
      EvidenceRefs: null,
      ResolutionNote: null,
      OpenedAt: '2026-06-21T00:00:00.000Z',
      ResolvedAt: null,
      ClosedAt: null,
      CreatedAt: '2026-06-21T00:00:00.000Z',
      UpdatedAt: '2026-06-21T00:00:00.000Z',
    } satisfies ExceptionCaseDto;
    const item = ComplianceMapper.toException(dto);
    expect(item.state).toBe('ASSIGNED');
    expect(item.assignedToUserId).toBe('u2');
    expect(item.severity).toBe('HIGH');
  });

  it('toResolveRequest strips nullish and maps evidence array', () => {
    expect(ComplianceMapper.toResolveRequest({ reasonCode: 'RC-EXC-RESOLVE' })).toEqual({
      ReasonCode: 'RC-EXC-RESOLVE',
    });
    expect(
      ComplianceMapper.toResolveRequest({ resolutionNote: 'done', evidenceRefs: ['x'] }),
    ).toEqual({ ResolutionNote: 'done', EvidenceRefs: ['x'] });
  });

  it('toLogRequest keeps HardBlock=false (a real value)', () => {
    expect(ComplianceMapper.toLogRequest({ hardBlock: false })).toEqual({ HardBlock: false });
    expect(ComplianceMapper.toLogRequest({})).toEqual({});
  });
});
