import type { PaginatedResponse } from '@shared/Types/Api';
import type { AuditLogEntry, ExceptionCase } from '@modules/Compliance/Domain/Entities/Compliance';
import type {
  AssignExceptionInput,
  LogExceptionInput,
  ResolveExceptionInput,
  SubmitExceptionInput,
} from '@modules/Compliance/Domain/Types/ComplianceTypes';
import type {
  AssignExceptionRequestDto,
  AuditLogDto,
  ExceptionCaseDto,
  LogExceptionRequestDto,
  PagedDto,
  ResolveExceptionRequestDto,
  SubmitExceptionRequestDto,
} from '@modules/Compliance/Infrastructure/Dtos/ComplianceDtos';

/** Strips nullish fields so request payloads OMIT them; `false`/`0` survive. */
function removeEmpty<T extends Record<string, unknown>>(value: T): T {
  return Object.fromEntries(
    Object.entries(value).filter(([, item]) => item !== undefined && item !== null),
  ) as T;
}

export const ComplianceMapper = {
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

  toAuditLog(dto: AuditLogDto): AuditLogEntry {
    return {
      id: dto.Id,
      occurredAt: dto.OccurredAt,
      actorUserId: dto.ActorUserId,
      actorRoleCodes: dto.ActorRoleCodes ?? [],
      actorType: dto.ActorType,
      action: dto.Action,
      objectType: dto.ObjectType,
      objectId: dto.ObjectId,
      objectCode: dto.ObjectCode,
      beforeJson: dto.BeforeJson,
      afterJson: dto.AfterJson,
      reasonCodeId: dto.ReasonCodeId,
      reasonNote: dto.ReasonNote,
      evidenceRefs: dto.EvidenceRefs,
      referenceType: dto.ReferenceType,
      referenceId: dto.ReferenceId,
      warehouseId: dto.WarehouseId,
      ownerId: dto.OwnerId,
      correlationId: dto.CorrelationId,
      result: dto.Result,
    };
  },

  toException(dto: ExceptionCaseDto): ExceptionCase {
    return {
      id: dto.Id,
      exceptionType: dto.ExceptionType,
      state: dto.State,
      subStatus: dto.SubStatus,
      outcome: dto.Outcome,
      referenceType: dto.ReferenceType,
      referenceId: dto.ReferenceId,
      warehouseId: dto.WarehouseId,
      ownerId: dto.OwnerId,
      reasonCodeId: dto.ReasonCodeId,
      assignedToUserId: dto.AssignedToUserId,
      assignedRoleId: dto.AssignedRoleId,
      detectedRuleId: dto.DetectedRuleId,
      approvalRequestId: dto.ApprovalRequestId,
      severity: dto.Severity,
      evidenceRefs: dto.EvidenceRefs,
      resolutionNote: dto.ResolutionNote,
      openedAt: dto.OpenedAt,
      resolvedAt: dto.ResolvedAt,
      closedAt: dto.ClosedAt,
      createdAt: dto.CreatedAt,
      updatedAt: dto.UpdatedAt,
    };
  },

  // ── Request builders (PascalCase, nullish stripped) ─────────────────────────

  toLogRequest(input: LogExceptionInput): LogExceptionRequestDto {
    return removeEmpty({ HardBlock: input.hardBlock });
  },

  toAssignRequest(input: AssignExceptionInput): AssignExceptionRequestDto {
    return removeEmpty({
      AssignedToUserId: input.assignedToUserId,
      AssignedRoleId: input.assignedRoleId,
      OwnerId: input.ownerId,
    });
  },

  toSubmitRequest(input: SubmitExceptionInput): SubmitExceptionRequestDto {
    return removeEmpty({
      RequireApproval: input.requireApproval,
      ReasonCode: input.reasonCode,
      ReasonNote: input.reasonNote,
    });
  },

  toResolveRequest(input: ResolveExceptionInput): ResolveExceptionRequestDto {
    return removeEmpty({
      ReasonCode: input.reasonCode,
      ResolutionNote: input.resolutionNote,
      EvidenceRefs: input.evidenceRefs,
    });
  },
};
