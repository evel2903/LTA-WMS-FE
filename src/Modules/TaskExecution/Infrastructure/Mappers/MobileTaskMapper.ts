import type { PaginatedResponse } from '@shared/Types/Api';
import type { MobileTask } from '@modules/TaskExecution/Domain/Types/MobileTask';
import type { ClaimMobileTaskInput } from '@modules/TaskExecution/Domain/Types/MobileTaskQuery';
import type {
  ClaimMobileTaskRequestDto,
  MobileTaskDto,
  PagedMobileTaskDto,
  ReleaseMobileTaskRequestDto,
} from '@modules/TaskExecution/Infrastructure/Dtos/MobileTaskDtos';

function removeNullish<T extends Record<string, unknown>>(value: T): Partial<T> {
  return Object.fromEntries(
    Object.entries(value).filter(([, item]) => item !== undefined && item !== null && item !== ''),
  ) as Partial<T>;
}

export const MobileTaskMapper = {
  toTask(dto: MobileTaskDto): MobileTask {
    return {
      id: dto.Id,
      taskCode: dto.TaskCode,
      taskType: dto.TaskType,
      taskStatus: dto.TaskStatus,
      warehouseId: dto.WarehouseId,
      warehouseCode: dto.WarehouseCode,
      ownerId: dto.OwnerId,
      ownerCode: dto.OwnerCode,
      sourceDocumentType: dto.SourceDocumentType,
      sourceDocumentId: dto.SourceDocumentId,
      sourceDocumentCode: dto.SourceDocumentCode,
      priority: dto.Priority,
      assignedUserId: dto.AssignedUserId,
      claimedAt: dto.ClaimedAt,
      releasedAt: dto.ReleasedAt,
      dueAt: dto.DueAt,
      deviceCode: dto.DeviceCode,
      sessionId: dto.SessionId,
      taskPayload: dto.TaskPayload,
      createdAt: dto.CreatedAt,
      updatedAt: dto.UpdatedAt,
    };
  },

  toPaged(dto: PagedMobileTaskDto): PaginatedResponse<MobileTask> {
    const items = dto?.Items ?? [];
    const meta = dto?.Meta;
    return {
      items: items.map((item) => MobileTaskMapper.toTask(item)),
      page: meta?.Page ?? 1,
      pageSize: meta?.PageSize ?? 0,
      totalItems: meta?.TotalItems ?? 0,
      totalPages: meta?.TotalPages ?? 0,
    };
  },

  toClaimRequest(input: ClaimMobileTaskInput = {}): ClaimMobileTaskRequestDto {
    return removeNullish({
      DeviceCode: input.deviceCode,
      SessionId: input.sessionId,
    }) as ClaimMobileTaskRequestDto;
  },

  toReleaseRequest(): ReleaseMobileTaskRequestDto {
    return {};
  },
};
