import type { HttpClient } from '@shared/Services/Http/ApiClient';
import type { PaginatedResponse } from '@shared/Types/Api';
import type { ApprovalRequest } from '@modules/Approval/Domain/Entities/Approval';
import type {
  ApprovalFilter,
  DecideApprovalInput,
} from '@modules/Approval/Domain/Types/ApprovalTypes';
import type { IApprovalRepository } from '@modules/Approval/Application/Interfaces/IApprovalRepository';
import { APPROVAL_ENDPOINTS } from '@modules/Approval/Infrastructure/Api/ApprovalEndpoints';
import type {
  ApprovalRequestDto,
  PagedDto,
} from '@modules/Approval/Infrastructure/Dtos/ApprovalDtos';
import { ApprovalMapper } from '@modules/Approval/Infrastructure/Mappers/ApprovalMapper';

const DEFAULT_PAGE_SIZE = 50;
const MAX_PAGE_SIZE = 100;

function paging(filter: { page?: number; pageSize?: number } = {}) {
  return {
    Page: !filter.page || filter.page < 1 ? 1 : filter.page,
    PageSize:
      !filter.pageSize || filter.pageSize < 1
        ? DEFAULT_PAGE_SIZE
        : Math.min(filter.pageSize, MAX_PAGE_SIZE),
  };
}

/** The single place that touches `httpClient` for the approval queue. */
export class ApprovalRepository implements IApprovalRepository {
  constructor(private readonly http: HttpClient) {}

  async list(filter: ApprovalFilter = {}): Promise<PaginatedResponse<ApprovalRequest>> {
    const dto = await this.http.get<PagedDto<ApprovalRequestDto>>(
      APPROVAL_ENDPOINTS.APPROVAL_REQUESTS,
      {
        params: {
          ...paging(filter),
          Decision: filter.decision,
          RequesterUserId: filter.requesterUserId,
          TargetObjectType: filter.targetObjectType,
          TargetObjectId: filter.targetObjectId,
          Action: filter.action,
        },
      },
    );
    return ApprovalMapper.toPaged(dto, (item) => ApprovalMapper.toApproval(item));
  }

  async getById(id: string): Promise<ApprovalRequest> {
    const dto = await this.http.get<ApprovalRequestDto>(APPROVAL_ENDPOINTS.APPROVAL_REQUEST_BY_ID(id));
    return ApprovalMapper.toApproval(dto);
  }

  async approve(id: string, input: DecideApprovalInput): Promise<ApprovalRequest> {
    const dto = await this.http.post<ApprovalRequestDto>(
      APPROVAL_ENDPOINTS.APPROVE(id),
      ApprovalMapper.toDecideRequest(input),
    );
    return ApprovalMapper.toApproval(dto);
  }

  async reject(id: string, input: DecideApprovalInput): Promise<ApprovalRequest> {
    const dto = await this.http.post<ApprovalRequestDto>(
      APPROVAL_ENDPOINTS.REJECT(id),
      ApprovalMapper.toDecideRequest(input),
    );
    return ApprovalMapper.toApproval(dto);
  }
}
