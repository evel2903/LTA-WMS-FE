import type { PaginatedResponse } from '@shared/Types/Api';
import type { OverrideLog } from '@modules/OverrideLog/Domain/Entities/OverrideLog';
import type {
  OverrideLogDto,
  PagedDto,
} from '@modules/OverrideLog/Infrastructure/Dtos/OverrideLogDtos';

export const OverrideLogMapper = {
  toPaged<TDto, TEntity>(
    dto: PagedDto<TDto>,
    mapper: (item: TDto) => TEntity,
  ): PaginatedResponse<TEntity> {
    const items = dto?.Items ?? [];
    const meta = dto?.Meta;
    return {
      items: items.map(mapper),
      page: meta?.Page ?? 1,
      pageSize: meta?.PageSize ?? 0,
      totalItems: meta?.TotalItems ?? 0,
      totalPages: meta?.TotalPages ?? 0,
    };
  },

  toOverrideLog(dto: OverrideLogDto): OverrideLog {
    return {
      id: dto.Id,
      ruleId: dto.RuleId,
      ruleCode: dto.RuleCode,
      actorUserId: dto.ActorUserId,
      targetObjectType: dto.TargetObjectType,
      targetObjectId: dto.TargetObjectId,
      targetObjectCode: dto.TargetObjectCode,
      scope: dto.Scope,
      controlMode: dto.ControlMode,
      action: dto.Action,
      reasonCodeId: dto.ReasonCodeId,
      reasonNote: dto.ReasonNote,
      evidenceRefs: dto.EvidenceRefs,
      approvalRequestId: dto.ApprovalRequestId,
      beforeJson: dto.BeforeJson,
      afterJson: dto.AfterJson,
      auditRef: dto.AuditRef,
      correlationId: dto.CorrelationId,
      createdAt: dto.CreatedAt,
    };
  },
};
