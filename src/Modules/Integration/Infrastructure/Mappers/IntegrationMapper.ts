import type { PaginatedResponse } from '@shared/Types/Api';
import type { OutboxMessage, ReconciliationItem, ReconciliationRun } from '@modules/Integration/Domain/Types/Integration';
import type {
  DeadLetterActionInput,
  CreateReconciliationRunInput,
  ResolveReconciliationItemInput,
  RecordOutboxFailureInput,
} from '@modules/Integration/Domain/Types/IntegrationQuery';
import type {
  OutboxMessageDto,
  PagedOutboxMessageDto,
  PagedReconciliationItemDto,
  PagedReconciliationRunDto,
  ReconciliationItemDto,
  ReconciliationRunCreatedDto,
  ReconciliationRunDto,
} from '@modules/Integration/Infrastructure/Dtos/IntegrationDtos';

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
    const meta = IntegrationMapper.meta(dto);
    return {
      items: dto.Items.map((item) => IntegrationMapper.toOutboxMessage(item)),
      page: meta.Page,
      pageSize: meta.PageSize,
      totalItems: meta.TotalItems,
      totalPages: meta.TotalPages,
    };
  }

  static toReconciliationRun(dto: ReconciliationRunDto): ReconciliationRun {
    return {
      id: dto.Id,
      businessReference: dto.BusinessReference,
      warehouseId: dto.WarehouseId,
      ownerId: dto.OwnerId,
      runStatus: dto.RunStatus,
      sourceCounts: dto.SourceCounts ?? {},
      itemCount: dto.ItemCount,
      mismatchCount: dto.MismatchCount,
      exceptionCount: dto.ExceptionCount,
      idempotencyKey: dto.IdempotencyKey,
      reasonCode: dto.ReasonCode,
      reasonCodeId: dto.ReasonCodeId,
      reasonNote: dto.ReasonNote,
      evidenceRefs: dto.EvidenceRefs ?? [],
      resolvedAt: dto.ResolvedAt,
      resolvedBy: dto.ResolvedBy,
      createdAt: dto.CreatedAt,
      createdBy: dto.CreatedBy,
      updatedAt: dto.UpdatedAt,
      isDuplicate: dto.IsDuplicate,
    };
  }

  static toReconciliationItem(dto: ReconciliationItemDto): ReconciliationItem {
    return {
      id: dto.Id,
      runId: dto.RunId,
      itemStatus: dto.ItemStatus,
      severity: dto.Severity,
      mismatchType: dto.MismatchType,
      sourceType: dto.SourceType,
      sourceId: dto.SourceId,
      expectedSummary: dto.ExpectedSummary,
      actualSummary: dto.ActualSummary,
      exceptionCaseId: dto.ExceptionCaseId,
      outboxMessageId: dto.OutboxMessageId,
      deadLetterMessageId: dto.DeadLetterMessageId,
      resolutionNote: dto.ResolutionNote,
      approvalRequestId: dto.ApprovalRequestId,
      reasonCode: dto.ReasonCode,
      reasonCodeId: dto.ReasonCodeId,
      reasonNote: dto.ReasonNote,
      evidenceRefs: dto.EvidenceRefs ?? [],
      resolvedAt: dto.ResolvedAt,
      resolvedBy: dto.ResolvedBy,
      createdAt: dto.CreatedAt,
      updatedAt: dto.UpdatedAt,
      isDuplicate: dto.IsDuplicate,
    };
  }

  static toReconciliationRunPage(dto: PagedReconciliationRunDto): PaginatedResponse<ReconciliationRun> {
    const meta = IntegrationMapper.meta(dto);
    return {
      items: dto.Items.map((item) => IntegrationMapper.toReconciliationRun(item)),
      page: meta.Page,
      pageSize: meta.PageSize,
      totalItems: meta.TotalItems,
      totalPages: meta.TotalPages,
    };
  }

  static toReconciliationItemPage(dto: PagedReconciliationItemDto): PaginatedResponse<ReconciliationItem> {
    const meta = IntegrationMapper.meta(dto);
    return {
      items: dto.Items.map((item) => IntegrationMapper.toReconciliationItem(item)),
      page: meta.Page,
      pageSize: meta.PageSize,
      totalItems: meta.TotalItems,
      totalPages: meta.TotalPages,
    };
  }

  static toReconciliationRunCreated(dto: ReconciliationRunCreatedDto): {
    run: ReconciliationRun;
    items: ReconciliationItem[];
  } {
    return {
      run: IntegrationMapper.toReconciliationRun(dto.Run),
      items: dto.Items.map((item) => IntegrationMapper.toReconciliationItem(item)),
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

  static toCreateReconciliationRunRequest(input: CreateReconciliationRunInput) {
    return removeEmpty({
      BusinessReference: input.businessReference,
      WarehouseId: input.warehouseId,
      OwnerId: input.ownerId,
      ReasonCode: input.reasonCode,
      ReasonNote: input.reasonNote,
      EvidenceRefs: input.evidenceRefs,
      IdempotencyKey: input.idempotencyKey,
    });
  }

  static toResolveReconciliationItemRequest(input: ResolveReconciliationItemInput) {
    return removeEmpty({
      ReasonCode: input.reasonCode,
      ReasonNote: input.reasonNote,
      EvidenceRefs: input.evidenceRefs,
      IdempotencyKey: input.idempotencyKey,
      ResolutionNote: input.resolutionNote,
      ApprovalRequestId: input.approvalRequestId,
      ImpactsInventory: input.impactsInventory,
      ImpactsFinance: input.impactsFinance,
    });
  }

  private static meta<
    T extends {
      Items?: unknown[];
      Meta?: PagedMeta;
      Page?: number;
      PageSize?: number;
      TotalItems?: number;
      TotalPages?: number;
    },
  >(dto: T): PagedMeta {
    return {
      Page: dto.Meta?.Page ?? dto.Page ?? 1,
      PageSize: dto.Meta?.PageSize ?? dto.PageSize ?? 50,
      TotalItems: dto.Meta?.TotalItems ?? dto.TotalItems ?? dto.Items?.length ?? 0,
      TotalPages: dto.Meta?.TotalPages ?? dto.TotalPages ?? 1,
    };
  }
}

interface PagedMeta {
  Page: number;
  PageSize: number;
  TotalItems: number;
  TotalPages: number;
}
