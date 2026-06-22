import { describe, expect, it } from 'vitest';

import type {
  MobileScanEventDto,
  MobileTaskDto,
  PagedMobileTaskDto,
} from '@modules/TaskExecution/Infrastructure/Dtos/MobileTaskDtos';
import { MobileTaskMapper } from '@modules/TaskExecution/Infrastructure/Mappers/MobileTaskMapper';

const dto: MobileTaskDto = {
  Id: 'task-a',
  TaskCode: 'MT-001',
  TaskType: 'Putaway',
  TaskStatus: 'Released',
  WarehouseId: 'warehouse-a',
  WarehouseCode: 'WH-A',
  OwnerId: 'owner-a',
  OwnerCode: 'OWN-A',
  SourceDocumentType: 'PutawayTask',
  SourceDocumentId: 'putaway-1',
  SourceDocumentCode: 'PUT-001',
  Priority: 10,
  AssignedUserId: null,
  ClaimedAt: null,
  ReleasedAt: null,
  DueAt: '2026-06-22T10:00:00.000Z',
  DeviceCode: null,
  SessionId: null,
  TaskPayload: { source: 'STAGE-01', target: 'A-01-01' },
  CreatedAt: '2026-06-22T08:00:00.000Z',
  UpdatedAt: '2026-06-22T08:00:00.000Z',
};

const scanDto: MobileScanEventDto = {
  Id: 'scan-1',
  TaskId: 'task-a',
  TaskCode: 'MT-001',
  WarehouseId: 'warehouse-a',
  OwnerId: 'owner-a',
  ScanType: 'Item',
  RawValue: '(01)01234567890128(10)LOT-A(17)260930',
  NormalizedValue: '01234567890128',
  Result: 'Accepted',
  ResolvedObjectType: 'SKU',
  ResolvedObjectId: 'sku-1',
  ParsedValueJson: { gtin: '01234567890128', lot: 'LOT-A', expiry: '260930' },
  RejectionCode: null,
  RejectionMessage: null,
  ReasonCode: null,
  DeviceCode: 'RF-01',
  SessionId: 'session-1',
  ActorUserId: 'current-user',
  CreatedAt: '2026-06-22T08:30:00.000Z',
};

describe('MobileTaskMapper', () => {
  it('maps PascalCase mobile task DTOs into camelCase domain objects', () => {
    expect(MobileTaskMapper.toTask(dto)).toMatchObject({
      id: 'task-a',
      taskCode: 'MT-001',
      taskType: 'Putaway',
      taskStatus: 'Released',
      warehouseId: 'warehouse-a',
      warehouseCode: 'WH-A',
      sourceDocumentCode: 'PUT-001',
      taskPayload: { source: 'STAGE-01', target: 'A-01-01' },
    });
  });

  it('maps paged task envelopes and tolerates null list payloads', () => {
    const page: PagedMobileTaskDto = {
      Items: [dto],
      Meta: { Page: 2, PageSize: 50, TotalItems: 51, TotalPages: 2 },
    };

    expect(MobileTaskMapper.toPaged(page)).toEqual({
      items: [expect.objectContaining({ id: 'task-a' })],
      page: 2,
      pageSize: 50,
      totalItems: 51,
      totalPages: 2,
    });
    expect(MobileTaskMapper.toPaged(null as unknown as PagedMobileTaskDto)).toEqual({
      items: [],
      page: 1,
      pageSize: 0,
      totalItems: 0,
      totalPages: 0,
    });
  });

  it('builds PascalCase claim/release payloads and omits nullish optionals', () => {
    expect(MobileTaskMapper.toClaimRequest({ deviceCode: 'RF-01', sessionId: null })).toEqual({
      DeviceCode: 'RF-01',
    });
    expect(MobileTaskMapper.toReleaseRequest()).toEqual({});
  });

  it('maps scan event DTOs with parsed GS1 evidence', () => {
    expect(MobileTaskMapper.toScanEvent(scanDto)).toMatchObject({
      id: 'scan-1',
      taskId: 'task-a',
      scanType: 'Item',
      rawValue: '(01)01234567890128(10)LOT-A(17)260930',
      normalizedValue: '01234567890128',
      result: 'Accepted',
      resolvedObjectType: 'SKU',
      resolvedObjectId: 'sku-1',
      parsedValueJson: { gtin: '01234567890128', lot: 'LOT-A', expiry: '260930' },
      deviceCode: 'RF-01',
    });
  });

  it('builds PascalCase scan payloads and omits nullish optionals', () => {
    expect(
      MobileTaskMapper.toRecordScanRequest({
        scanType: 'Item',
        rawValue: '(01)01234567890128',
        manualEntry: false,
        reasonCode: '',
        deviceCode: 'RF-01',
        sessionId: null,
      }),
    ).toEqual({
      ScanType: 'Item',
      RawValue: '(01)01234567890128',
      ManualEntry: false,
      DeviceCode: 'RF-01',
    });
  });
});
