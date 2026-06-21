import { httpClient } from '@shared/Services/Http/ApiClient';
import type { IApprovalRepository } from '@modules/Approval/Application/Interfaces/IApprovalRepository';
import { ApprovalRepository } from '@modules/Approval/Infrastructure/Repositories/ApprovalRepository';

export const approvalRepository: IApprovalRepository = new ApprovalRepository(httpClient);
