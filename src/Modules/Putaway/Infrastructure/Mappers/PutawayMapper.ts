import type { PaginatedResponse } from '@shared/Types/Api';
import type { PutawayTask } from '@modules/Putaway/Domain/Types/PutawayTask';
import type { ReleasePutawayTaskInput } from '@modules/Putaway/Domain/Types/PutawayTaskQuery';
import type {
  PagedPutawayTaskDto,
  PutawayTaskDto,
  ReleasePutawayTaskRequestDto,
} from '@modules/Putaway/Infrastructure/Dtos/PutawayDtos';

function removeNullish<T extends Record<string, unknown>>(value: T): Partial<T> {
  return Object.fromEntries(
    Object.entries(value).filter(([, item]) => item !== undefined && item !== null && item !== ''),
  ) as Partial<T>;
}

export const PutawayMapper = {
  toTask(dto: PutawayTaskDto): PutawayTask {
    return {
      id: dto.Id,
      taskCode: dto.TaskCode,
      taskStatus: dto.TaskStatus,
      inboundPutawayReleaseId: dto.InboundPutawayReleaseId,
      receiptId: dto.ReceiptId,
      receiptLineId: dto.ReceiptLineId,
      inboundPlanId: dto.InboundPlanId,
      inboundPlanLineId: dto.InboundPlanLineId,
      inboundLpnId: dto.InboundLpnId,
      ownerId: dto.OwnerId,
      ownerCode: dto.OwnerCode,
      warehouseId: dto.WarehouseId,
      warehouseCode: dto.WarehouseCode,
      skuId: dto.SkuId,
      skuCode: dto.SkuCode,
      uomId: dto.UomId,
      uomCode: dto.UomCode,
      quantity: dto.Quantity,
      lpnCode: dto.LpnCode,
      ssccCode: dto.SsccCode,
      inventoryStatusCode: dto.InventoryStatusCode,
      sourceLocationId: dto.SourceLocationId,
      sourceLocationCode: dto.SourceLocationCode,
      targetLocationId: dto.TargetLocationId,
      targetLocationCode: dto.TargetLocationCode,
      targetLocationProfileId: dto.TargetLocationProfileId,
      priority: dto.Priority,
      workPoolCode: dto.WorkPoolCode,
      assignedUserId: dto.AssignedUserId,
      constraintJson: dto.ConstraintJson,
      eligibilityDecisionJson: dto.EligibilityDecisionJson,
      outboxMessageId: dto.OutboxMessageId,
      mobileTaskId: dto.MobileTaskId,
      reasonCode: dto.ReasonCode,
      reasonCodeId: dto.ReasonCodeId,
      reasonNote: dto.ReasonNote,
      evidenceRefs: dto.EvidenceRefs ?? [],
      idempotencyKey: dto.IdempotencyKey,
      releasedAt: dto.ReleasedAt,
      releasedBy: dto.ReleasedBy,
      isDuplicate: dto.IsDuplicate,
      createdAt: dto.CreatedAt,
      updatedAt: dto.UpdatedAt,
    };
  },

  toPaged(dto: PagedPutawayTaskDto): PaginatedResponse<PutawayTask> {
    const items = dto?.Items ?? [];
    const meta = dto?.Meta;
    return {
      items: items.map((item) => PutawayMapper.toTask(item)),
      page: meta?.Page ?? 1,
      pageSize: meta?.PageSize ?? 0,
      totalItems: meta?.TotalItems ?? 0,
      totalPages: meta?.TotalPages ?? 0,
    };
  },

  toReleaseRequest(input: ReleasePutawayTaskInput): ReleasePutawayTaskRequestDto {
    return removeNullish({
      InboundPutawayReleaseId: input.inboundPutawayReleaseId,
      SourceLocationId: input.sourceLocationId,
      SourceLocationCode: input.sourceLocationCode,
      TargetLocationId: input.targetLocationId,
      Priority: input.priority,
      WorkPoolCode: input.workPoolCode,
      AssignedUserId: input.assignedUserId,
      AttemptOverride: input.attemptOverride,
      ReasonCode: input.reasonCode,
      ReasonNote: input.reasonNote,
      EvidenceRefs: input.evidenceRefs,
      IdempotencyKey: input.idempotencyKey,
    }) as ReleasePutawayTaskRequestDto;
  },
};
