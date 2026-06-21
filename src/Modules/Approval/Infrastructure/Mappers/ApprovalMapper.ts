import type { PaginatedResponse } from '@shared/Types/Api';
import type { ApprovalRequest } from '@modules/Approval/Domain/Entities/Approval';
import type { DecideApprovalInput } from '@modules/Approval/Domain/Types/ApprovalTypes';
import type {
  ApprovalRequestDto,
  DecideApprovalRequestDto,
  PagedDto,
} from '@modules/Approval/Infrastructure/Dtos/ApprovalDtos';

/** Strips nullish fields so decision payloads OMIT them; `false`/`0` survive. */
function removeEmpty<T extends Record<string, unknown>>(value: T): T {
  return Object.fromEntries(
    Object.entries(value).filter(([, item]) => item !== undefined && item !== null),
  ) as T;
}

export const ApprovalMapper = {
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

  toApproval(dto: ApprovalRequestDto): ApprovalRequest {
    return {
      id: dto.Id,
      requesterUserId: dto.RequesterUserId,
      action: dto.Action,
      targetObjectType: dto.TargetObjectType,
      targetObjectId: dto.TargetObjectId,
      targetObjectCode: dto.TargetObjectCode,
      scope: dto.Scope,
      requestReasonCodeId: dto.RequestReasonCodeId,
      requestReasonNote: dto.RequestReasonNote,
      evidenceRefs: dto.EvidenceRefs,
      decision: dto.Decision,
      decidedByUserId: dto.DecidedByUserId,
      decisionReasonCodeId: dto.DecisionReasonCodeId,
      decisionNote: dto.DecisionNote,
      decidedAt: dto.DecidedAt,
      referenceType: dto.ReferenceType,
      referenceId: dto.ReferenceId,
      createdAt: dto.CreatedAt,
      updatedAt: dto.UpdatedAt,
    };
  },

  /** Approve and reject share this body builder; the endpoint decides APPROVED vs REJECTED. */
  toDecideRequest(input: DecideApprovalInput): DecideApprovalRequestDto {
    return removeEmpty({
      ReasonCode: input.reasonCode,
      ReasonNote: input.reasonNote,
      EvidenceRefs: input.evidenceRefs && input.evidenceRefs.length > 0 ? input.evidenceRefs : undefined,
    });
  },
};
