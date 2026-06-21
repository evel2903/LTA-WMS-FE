import type { PaginatedResponse } from '@shared/Types/Api';
import type { ApprovalRequest } from '@modules/Approval/Domain/Entities/Approval';
import type {
  ApprovalFilter,
  DecideApprovalInput,
} from '@modules/Approval/Domain/Types/ApprovalTypes';

/**
 * Application port for the approval queue (C6). The reviewer screen reads requests and posts
 * a single decision (approve/reject) per PENDING request — there is no create/delete here.
 */
export interface IApprovalRepository {
  list(filter?: ApprovalFilter): Promise<PaginatedResponse<ApprovalRequest>>;
  getById(id: string): Promise<ApprovalRequest>;
  approve(id: string, input: DecideApprovalInput): Promise<ApprovalRequest>;
  reject(id: string, input: DecideApprovalInput): Promise<ApprovalRequest>;
}
