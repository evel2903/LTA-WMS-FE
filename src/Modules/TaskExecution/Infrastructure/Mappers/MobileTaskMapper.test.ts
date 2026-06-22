import { describe, expect, it } from 'vitest';

import type {
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
});
