import { describe, expect, it } from 'vitest';

import { IntegrationMapper } from '@modules/Integration/Infrastructure/Mappers/IntegrationMapper';
import type { OutboxMessageDto } from '@modules/Integration/Infrastructure/Dtos/IntegrationDtos';

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
});
