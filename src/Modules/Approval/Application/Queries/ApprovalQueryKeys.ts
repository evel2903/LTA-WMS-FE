import { QUERY_NAMESPACES } from '@shared/Constants/QueryKeys';
import type { ApprovalFilter } from '@modules/Approval/Domain/Types/ApprovalTypes';

export const approvalQueryKeys = {
  all: [QUERY_NAMESPACES.APPROVAL] as const,
  list: (filter?: ApprovalFilter) => [...approvalQueryKeys.all, 'requests', filter ?? {}] as const,
  detail: (id: string) => [...approvalQueryKeys.all, 'request', id] as const,
};
