import type { HttpClient } from '@shared/Services/Http/ApiClient';
import type { PaginatedResponse } from '@shared/Types/Api';
import type { ITaskExecutionRepository } from '@modules/TaskExecution/Application/Interfaces/ITaskExecutionRepository';
import {
  MOBILE_TASK_DEFAULT_PAGE_SIZE,
  MOBILE_TASK_MAX_PAGE_SIZE,
} from '@modules/TaskExecution/Domain/Constants/MobileTaskConstants';
import type { MobileScanEvent, MobileTask } from '@modules/TaskExecution/Domain/Types/MobileTask';
import type {
  ClaimMobileTaskInput,
  ConfirmPickTaskInput,
  ConfirmPickTaskResult,
  MobileTaskListFilter,
  PickExceptionResult,
  RecordMobileScanInput,
  ReportPickExceptionInput,
  RequestPickSubstitutionInput,
} from '@modules/TaskExecution/Domain/Types/MobileTaskQuery';
import { TASK_EXECUTION_ENDPOINTS } from '@modules/TaskExecution/Infrastructure/Api/TaskExecutionEndpoints';
import type {
  MobileScanEventDto,
  MobileTaskDto,
  PagedMobileTaskDto,
  ConfirmPickTaskResultDto,
  PickExceptionResultDto,
} from '@modules/TaskExecution/Infrastructure/Dtos/MobileTaskDtos';
import { MobileTaskMapper } from '@modules/TaskExecution/Infrastructure/Mappers/MobileTaskMapper';

function pageSize(value?: number): number {
  if (!value || value < 1) return MOBILE_TASK_DEFAULT_PAGE_SIZE;
  return Math.min(value, MOBILE_TASK_MAX_PAGE_SIZE);
}

function removeUndefined<T extends Record<string, unknown>>(value: T): T {
  return Object.fromEntries(Object.entries(value).filter(([, item]) => item !== undefined)) as T;
}

export class TaskExecutionRepository implements ITaskExecutionRepository {
  constructor(private readonly http: HttpClient) {}

  async list(filter: MobileTaskListFilter = {}): Promise<PaginatedResponse<MobileTask>> {
    const dto = await this.http.get<PagedMobileTaskDto>(TASK_EXECUTION_ENDPOINTS.TASKS, {
      params: removeUndefined({
        Page: filter.page ?? 1,
        PageSize: pageSize(filter.pageSize),
        WarehouseId: filter.warehouseId,
        TaskType: filter.taskType,
        TaskStatus: filter.taskStatus,
      }),
    });
    return MobileTaskMapper.toPaged(dto);
  }

  async getById(id: string): Promise<MobileTask> {
    const dto = await this.http.get<MobileTaskDto>(TASK_EXECUTION_ENDPOINTS.TASK_BY_ID(id));
    return MobileTaskMapper.toTask(dto);
  }

  async claim(id: string, input?: ClaimMobileTaskInput): Promise<MobileTask> {
    const dto = await this.http.post<MobileTaskDto>(
      TASK_EXECUTION_ENDPOINTS.CLAIM(id),
      MobileTaskMapper.toClaimRequest(input),
    );
    return MobileTaskMapper.toTask(dto);
  }

  async release(id: string): Promise<MobileTask> {
    const dto = await this.http.post<MobileTaskDto>(
      TASK_EXECUTION_ENDPOINTS.RELEASE(id),
      MobileTaskMapper.toReleaseRequest(),
    );
    return MobileTaskMapper.toTask(dto);
  }

  async recordScan(id: string, input: RecordMobileScanInput): Promise<MobileScanEvent> {
    const dto = await this.http.post<MobileScanEventDto>(
      TASK_EXECUTION_ENDPOINTS.SCANS(id),
      MobileTaskMapper.toRecordScanRequest(input),
    );
    return MobileTaskMapper.toScanEvent(dto);
  }

  async confirmPickTask(
    mobileTaskId: string,
    input: ConfirmPickTaskInput,
  ): Promise<ConfirmPickTaskResult> {
    const dto = await this.http.post<ConfirmPickTaskResultDto>(
      TASK_EXECUTION_ENDPOINTS.CONFIRM_PICK_TASK(mobileTaskId),
      MobileTaskMapper.toConfirmPickTaskRequest(input),
    );
    return MobileTaskMapper.toConfirmPickTaskResult(dto);
  }

  async reportPickException(
    mobileTaskId: string,
    input: ReportPickExceptionInput,
  ): Promise<PickExceptionResult> {
    const dto = await this.http.post<PickExceptionResultDto>(
      TASK_EXECUTION_ENDPOINTS.REPORT_PICK_EXCEPTION(mobileTaskId),
      MobileTaskMapper.toReportPickExceptionRequest(input),
    );
    return MobileTaskMapper.toPickExceptionResult(dto);
  }

  async requestPickSubstitution(
    mobileTaskId: string,
    input: RequestPickSubstitutionInput,
  ): Promise<PickExceptionResult> {
    const dto = await this.http.post<PickExceptionResultDto>(
      TASK_EXECUTION_ENDPOINTS.REQUEST_PICK_SUBSTITUTION(mobileTaskId),
      MobileTaskMapper.toRequestPickSubstitutionRequest(input),
    );
    return MobileTaskMapper.toPickExceptionResult(dto);
  }
}
