import type { PaginatedResponse } from '@shared/Types/Api';
import type { InventoryStatus } from '@modules/InventoryStatus/Domain/Entities/InventoryStatus';
import type { UpdateInventoryStatusInput } from '@modules/InventoryStatus/Domain/Types/InventoryStatusTypes';
import type {
  InventoryStatusDto,
  PagedDto,
  UpdateInventoryStatusRequestDto,
} from '@modules/InventoryStatus/Infrastructure/Dtos/InventoryStatusDtos';

/**
 * Strips nullish fields so a PATCH OMITs untouched flags; `false`/`0` survive — critical here
 * because `hold: false`, `allowsAllocation: false`, `sortOrder: 0` are real values that must
 * reach the backend rather than being dropped.
 */
function removeEmpty<T extends Record<string, unknown>>(value: T): T {
  return Object.fromEntries(
    Object.entries(value).filter(([, item]) => item !== undefined && item !== null),
  ) as T;
}

export const InventoryStatusMapper = {
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

  toInventoryStatus(dto: InventoryStatusDto): InventoryStatus {
    return {
      id: dto.Id,
      statusCode: dto.StatusCode,
      displayName: dto.DisplayName,
      stageGroup: dto.StageGroup,
      allowsAllocation: dto.AllowsAllocation,
      allowsPick: dto.AllowsPick,
      hold: dto.Hold,
      isTerminal: dto.IsTerminal,
      isMilestone: dto.IsMilestone,
      sortOrder: dto.SortOrder,
      status: dto.Status,
      sourceSystem: dto.SourceSystem,
      referenceId: dto.ReferenceId,
      updatedAt: typeof dto.UpdatedAt === 'string' ? dto.UpdatedAt : null,
    };
  },

  toUpdateRequest(input: UpdateInventoryStatusInput): UpdateInventoryStatusRequestDto {
    return removeEmpty({
      AllowsAllocation: input.allowsAllocation,
      AllowsPick: input.allowsPick,
      Hold: input.hold,
      IsTerminal: input.isTerminal,
      IsMilestone: input.isMilestone,
      SortOrder: input.sortOrder,
      Status: input.status,
      ReasonCode: input.reasonCode,
    });
  },
};
