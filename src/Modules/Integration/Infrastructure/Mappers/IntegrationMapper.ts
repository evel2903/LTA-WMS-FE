import type { PaginatedResponse } from '@shared/Types/Api';
import type { OutboxMessage } from '@modules/Integration/Domain/Types/Integration';
import type {
  DeadLetterActionInput,
  RecordOutboxFailureInput,
} from '@modules/Integration/Domain/Types/IntegrationQuery';
import type { OutboxMessageDto, PagedOutboxMessageDto } from '@modules/Integration/Infrastructure/Dtos/IntegrationDtos';

function removeEmpty<T extends Record<string, unknown>>(value: T): T {
  return Object.fromEntries(
    Object.entries(value).filter(([, item]) => item !== undefined && item !== null && item !== ''),
  ) as T;
}

export class IntegrationMapper {
  static toOutboxMessage(dto: OutboxMessageDto): OutboxMessage {
    return {
      id: dto.Id,
      sourceMessageId: dto.SourceMessageId,
      messageId: dto.MessageId,
      eventType: dto.EventType,
      version: dto.Version,
      businessReference: dto.BusinessReference,
      sourceSystem: dto.SourceSystem,
      targetSystem: dto.TargetSystem,
      warehouseContext: dto.WarehouseContext,
      ownerContext: dto.OwnerContext,
      eventTime: dto.EventTime,
      correlationId: dto.CorrelationId,
      causationId: dto.CausationId,
      payload: dto.Payload,
      status: dto.Status,
      attemptCount: dto.AttemptCount,
      maxAttempts: dto.MaxAttempts,
      nextRetryAt: dto.NextRetryAt,
      lastError: dto.LastError,
      failureCategory: dto.FailureCategory,
      deadLetterReason: dto.DeadLetterReason,
      deadLetteredAt: dto.DeadLetteredAt,
      resolutionAction: dto.ResolutionAction,
      actionIdempotencyKey: dto.ActionIdempotencyKey,
      resolvedAt: dto.ResolvedAt,
      resolvedBy: dto.ResolvedBy,
      reasonCode: dto.ReasonCode,
      reasonCodeId: dto.ReasonCodeId,
      reasonNote: dto.ReasonNote,
      evidenceRefs: dto.EvidenceRefs ?? [],
      createdAt: dto.CreatedAt,
      createdBy: dto.CreatedBy,
      updatedAt: dto.UpdatedAt,
      isDuplicate: dto.IsDuplicate,
    };
  }

  static toPaged(dto: PagedOutboxMessageDto): PaginatedResponse<OutboxMessage> {
    return {
      items: dto.Items.map((item) => IntegrationMapper.toOutboxMessage(item)),
      page: dto.Page,
      pageSize: dto.PageSize,
      totalItems: dto.TotalItems,
      totalPages: dto.TotalPages,
    };
  }

  static toDeadLetterActionRequest(input: DeadLetterActionInput) {
    return removeEmpty({
      ReasonCode: input.reasonCode,
      ReasonNote: input.reasonNote,
      EvidenceRefs: input.evidenceRefs,
      IdempotencyKey: input.idempotencyKey,
      ManualFixPayload: input.manualFixPayload,
    });
  }

  static toFailureRequest(input: RecordOutboxFailureInput) {
    return removeEmpty({
      FailureCategory: input.failureCategory,
      ErrorMessage: input.errorMessage,
    });
  }
}
