import { describe, expect, it } from 'vitest';

import { IntegrationMapper } from '@modules/Integration/Infrastructure/Mappers/IntegrationMapper';
import type {
  OutboxMessageDto,
  ReconciliationItemDto,
  ReconciliationRunDto,
} from '@modules/Integration/Infrastructure/Dtos/IntegrationDtos';

export const outboxDto: OutboxMessageDto = {
  Id: 'outbox-1',
  SourceMessageId: 'source-1',
  MessageId: 'msg-1',
  EventType: 'GoodsIssuePosted',
  Version: '1.0',
  BusinessReference: 'SHIP-001',
  SourceSystem: 'LTA-WMS',
  TargetSystem: 'ERP_TMS',
  WarehouseContext: 'WT-01',
  OwnerContext: 'OWNER-A',
  EventTime: '2026-06-25T00:00:00.000Z',
  CorrelationId: 'corr-1',
  CausationId: 'cause-1',
  Payload: { shipmentReference: 'SHIP-001' },
  Status: 'DeadLetter',
  AttemptCount: 5,
  MaxAttempts: 5,
  NextRetryAt: null,
  LastError: 'ERP timeout',
  FailureCategory: 'RetryExhausted',
  DeadLetterReason: 'ERP timeout',
  DeadLetteredAt: '2026-06-25T00:05:00.000Z',
  ResolutionAction: null,
  ActionIdempotencyKey: null,
  ResolvedAt: null,
  ResolvedBy: null,
  ReasonCode: null,
  ReasonCodeId: null,
  ReasonNote: null,
  EvidenceRefs: [],
  CreatedAt: '2026-06-25T00:00:00.000Z',
  CreatedBy: 'user-1',
  UpdatedAt: '2026-06-25T00:05:00.000Z',
  IsDuplicate: false,
};

export const reconciliationRunDto: ReconciliationRunDto = {
  Id: 'run-1',
  BusinessReference: 'SHIP-001',
  WarehouseId: 'WT-01',
  OwnerId: 'OWNER-A',
  RunStatus: 'CompletedWithMismatch',
  SourceCounts: { OutboxMessages: 1, QuantityMismatches: 1 },
  ItemCount: 1,
  MismatchCount: 1,
  ExceptionCount: 1,
  IdempotencyKey: 'recon-1',
  ReasonCode: 'RC-V1-DEAD-LETTER-FIX',
  ReasonCodeId: 'reason-1',
  ReasonNote: 'Manual reconciliation',
  EvidenceRefs: ['ticket:RECON-1'],
  ResolvedAt: null,
  ResolvedBy: null,
  CreatedAt: '2026-06-25T00:00:00.000Z',
  CreatedBy: 'user-1',
  UpdatedAt: '2026-06-25T00:05:00.000Z',
  IsDuplicate: false,
};

export const reconciliationItemDto: ReconciliationItemDto = {
  Id: 'item-1',
  RunId: 'run-1',
  ItemStatus: 'Open',
  Severity: 'High',
  MismatchType: 'QuantityMismatch',
  SourceType: 'GoodsIssuePosted',
  SourceId: 'msg-1',
  ExpectedSummary: { Quantity: 10 },
  ActualSummary: { Quantity: 8 },
  ExceptionCaseId: 'exception-1',
  OutboxMessageId: 'outbox-1',
  DeadLetterMessageId: 'outbox-1',
  ResolutionNote: null,
  ApprovalRequestId: null,
  ReasonCode: null,
  ReasonCodeId: null,
  ReasonNote: null,
  EvidenceRefs: [],
  ResolvedAt: null,
  ResolvedBy: null,
  CreatedAt: '2026-06-25T00:00:00.000Z',
  UpdatedAt: '2026-06-25T00:05:00.000Z',
  IsDuplicate: false,
};

describe('IntegrationMapper', () => {
  it('maps outbox/dead-letter DTO to domain shape', () => {
    expect(IntegrationMapper.toOutboxMessage(outboxDto)).toMatchObject({
      id: 'outbox-1',
      messageId: 'msg-1',
      eventType: 'GoodsIssuePosted',
      businessReference: 'SHIP-001',
      status: 'DeadLetter',
      attemptCount: 5,
      maxAttempts: 5,
      failureCategory: 'RetryExhausted',
      ownerContext: 'OWNER-A',
    });
  });

  it('maps action and failure requests to PascalCase without empty fields', () => {
    expect(
      IntegrationMapper.toDeadLetterActionRequest({
        reasonCode: 'RC-V1-DEAD-LETTER-FIX',
        reasonNote: '',
        evidenceRefs: ['ticket:INT-1'],
        idempotencyKey: 'retry-1',
        manualFixPayload: null,
      }),
    ).toEqual({
      ReasonCode: 'RC-V1-DEAD-LETTER-FIX',
      EvidenceRefs: ['ticket:INT-1'],
      IdempotencyKey: 'retry-1',
    });
    expect(
      IntegrationMapper.toFailureRequest({
        id: 'outbox-1',
        failureCategory: 'Validation',
        errorMessage: 'Missing owner',
      }),
    ).toEqual({ FailureCategory: 'Validation', ErrorMessage: 'Missing owner' });
  });

  it('maps reconciliation DTOs, Meta pagination and governed request payloads', () => {
    expect(IntegrationMapper.toReconciliationRun(reconciliationRunDto)).toMatchObject({
      id: 'run-1',
      businessReference: 'SHIP-001',
      runStatus: 'CompletedWithMismatch',
      sourceCounts: { OutboxMessages: 1, QuantityMismatches: 1 },
    });
    expect(IntegrationMapper.toReconciliationItem(reconciliationItemDto)).toMatchObject({
      id: 'item-1',
      itemStatus: 'Open',
      severity: 'High',
      mismatchType: 'QuantityMismatch',
      deadLetterMessageId: 'outbox-1',
    });
    expect(
      IntegrationMapper.toReconciliationRunPage({
        Items: [reconciliationRunDto],
        Meta: { Page: 1, PageSize: 100, TotalItems: 1, TotalPages: 1 },
      }),
    ).toMatchObject({ pageSize: 100, totalItems: 1, items: [{ id: 'run-1' }] });
    expect(
      IntegrationMapper.toCreateReconciliationRunRequest({
        businessReference: 'SHIP-001',
        warehouseId: 'WT-01',
        ownerId: '',
        reasonCode: 'RC-V1-DEAD-LETTER-FIX',
        reasonNote: '',
        evidenceRefs: ['ticket:RECON-1'],
        idempotencyKey: 'recon-1',
      }),
    ).toEqual({
      BusinessReference: 'SHIP-001',
      WarehouseId: 'WT-01',
      ReasonCode: 'RC-V1-DEAD-LETTER-FIX',
      EvidenceRefs: ['ticket:RECON-1'],
      IdempotencyKey: 'recon-1',
    });
    expect(
      IntegrationMapper.toResolveReconciliationItemRequest({
        reasonCode: 'RC-V1-DEAD-LETTER-FIX',
        evidenceRefs: ['ticket:RECON-2'],
        idempotencyKey: 'resolve-1',
        resolutionNote: 'External correction confirmed',
        impactsInventory: true,
        approvalRequestId: 'approval-1',
      }),
    ).toMatchObject({
      ReasonCode: 'RC-V1-DEAD-LETTER-FIX',
      EvidenceRefs: ['ticket:RECON-2'],
      IdempotencyKey: 'resolve-1',
      ResolutionNote: 'External correction confirmed',
      ImpactsInventory: true,
      ApprovalRequestId: 'approval-1',
    });
  });
});
