import { describe, expect, it } from 'vitest';

import { InventoryStatusMapper } from '@modules/InventoryStatus/Infrastructure/Mappers/InventoryStatusMapper';
import type {
  InventoryStatusDto,
  PagedDto,
} from '@modules/InventoryStatus/Infrastructure/Dtos/InventoryStatusDtos';

const dto: InventoryStatusDto = {
  Id: 'is1',
  StatusCode: 'AVAILABLE',
  DisplayName: 'Available',
  StageGroup: 'Storage',
  AllowsAllocation: true,
  AllowsPick: true,
  Hold: false,
  IsTerminal: false,
  IsMilestone: false,
  SortOrder: 10,
  Status: 'Active',
  SourceSystem: null,
  ReferenceId: null,
  UpdatedAt: '2026-06-21T00:00:00.000Z',
};

describe('InventoryStatusMapper', () => {
  it('toPaged maps Items + Meta and null-guards empty', () => {
    const paged: PagedDto<InventoryStatusDto> = {
      Items: [dto],
      Meta: { Page: 1, PageSize: 20, TotalItems: 1, TotalPages: 1 },
    };
    const result = InventoryStatusMapper.toPaged(paged, (item) =>
      InventoryStatusMapper.toInventoryStatus(item),
    );
    expect(result.items[0].statusCode).toBe('AVAILABLE');
    expect(result.totalPages).toBe(1);
    expect(
      InventoryStatusMapper.toPaged({} as PagedDto<InventoryStatusDto>, (i) =>
        InventoryStatusMapper.toInventoryStatus(i),
      ).items,
    ).toEqual([]);
  });

  it('toInventoryStatus maps fields incl Hold + null source/reference', () => {
    const entity = InventoryStatusMapper.toInventoryStatus(dto);
    expect(entity.hold).toBe(false);
    expect(entity.allowsAllocation).toBe(true);
    expect(entity.status).toBe('Active');
    expect(entity.sourceSystem).toBeNull();
    expect(entity.updatedAt).toBe('2026-06-21T00:00:00.000Z');
  });

  it('toUpdateRequest KEEPS hold=false / sortOrder=0 and carries ReasonCode', () => {
    const body = InventoryStatusMapper.toUpdateRequest({
      allowsAllocation: false,
      hold: false,
      sortOrder: 0,
      status: 'Active',
      reasonCode: 'RC-MD-UPDATE',
    });
    expect(body).toEqual({
      AllowsAllocation: false,
      Hold: false,
      SortOrder: 0,
      Status: 'Active',
      ReasonCode: 'RC-MD-UPDATE',
    });
  });

  it('toUpdateRequest omits untouched (undefined) flags but always sends ReasonCode', () => {
    const body = InventoryStatusMapper.toUpdateRequest({ hold: true, reasonCode: 'RC-MD-UPDATE' });
    expect(body).toEqual({ Hold: true, ReasonCode: 'RC-MD-UPDATE' });
    expect('AllowsAllocation' in body).toBe(false);
    expect('Status' in body).toBe(false);
  });
});
