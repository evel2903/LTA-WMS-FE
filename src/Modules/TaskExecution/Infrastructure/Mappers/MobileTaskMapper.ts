import type { PaginatedResponse } from '@shared/Types/Api';
import type { MobileScanEvent, MobileTask } from '@modules/TaskExecution/Domain/Types/MobileTask';
import type {
  ClaimMobileTaskInput,
  ConfirmPickTaskInput,
  ConfirmPickTaskResult,
  RecordMobileScanInput,
} from '@modules/TaskExecution/Domain/Types/MobileTaskQuery';
import type {
  ClaimMobileTaskRequestDto,
  ConfirmPickTaskRequestDto,
  ConfirmPickTaskResultDto,
  MobileScanEventDto,
  MobileTaskDto,
  PagedMobileTaskDto,
  RecordMobileScanRequestDto,
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

  toScanEvent(dto: MobileScanEventDto): MobileScanEvent {
    return {
      id: dto.Id,
      taskId: dto.TaskId,
      taskCode: dto.TaskCode,
      warehouseId: dto.WarehouseId,
      ownerId: dto.OwnerId,
      scanType: dto.ScanType,
      rawValue: dto.RawValue,
      normalizedValue: dto.NormalizedValue,
      result: dto.Result,
      resolvedObjectType: dto.ResolvedObjectType,
      resolvedObjectId: dto.ResolvedObjectId,
      parsedValueJson: dto.ParsedValueJson ?? {},
      rejectionCode: dto.RejectionCode,
      rejectionMessage: dto.RejectionMessage,
      reasonCode: dto.ReasonCode,
      deviceCode: dto.DeviceCode,
      sessionId: dto.SessionId,
      actorUserId: dto.ActorUserId,
      createdAt: dto.CreatedAt,
    };
  },

  toRecordScanRequest(input: RecordMobileScanInput): RecordMobileScanRequestDto {
    return removeNullish({
      ScanType: input.scanType,
      RawValue: input.rawValue,
      ManualEntry: input.manualEntry,
      ReasonCode: input.reasonCode,
      DeviceCode: input.deviceCode,
      SessionId: input.sessionId,
    }) as RecordMobileScanRequestDto;
  },

  toConfirmPickTaskRequest(input: ConfirmPickTaskInput): ConfirmPickTaskRequestDto {
    return removeNullish({
      MobileTaskId: input.mobileTaskId,
      ReasonCode: input.reasonCode,
      ReasonNote: input.reasonNote,
      EvidenceRefs: input.evidenceRefs,
      DeviceCode: input.deviceCode,
      SessionId: input.sessionId,
      IdempotencyKey: input.idempotencyKey,
    }) as ConfirmPickTaskRequestDto;
  },

  toConfirmPickTaskResult(dto: ConfirmPickTaskResultDto): ConfirmPickTaskResult {
    return {
      pickTask: dto.PickTask ?? {},
      mobileTask: dto.MobileTask ? MobileTaskMapper.toTask(dto.MobileTask) : null,
      inventoryControl: dto.InventoryControl ?? null,
      scanEvidence:
        dto.ScanEvidence?.map((scan) => ({
          scanType: scan.ScanType,
          scanEventId: scan.ScanEventId,
          rawValue: scan.RawValue,
          expectedValue: scan.ExpectedValue,
          actualValue: scan.ActualValue,
          result: scan.Result,
          rejectionCode: scan.RejectionCode ?? null,
        })) ?? [],
      outboxMessageId: dto.OutboxMessageId,
      isDuplicate: dto.IsDuplicate,
    };
  },
};
