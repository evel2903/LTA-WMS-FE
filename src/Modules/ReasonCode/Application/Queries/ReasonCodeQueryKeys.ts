import { QUERY_NAMESPACES } from '@shared/Constants/QueryKeys';
import type { ReasonCodeFilter } from '@modules/ReasonCode/Domain/Types/ReasonCodeTypes';

export const reasonCodeQueryKeys = {
  all: [QUERY_NAMESPACES.REASON_CODE] as const,
  list: (filter?: ReasonCodeFilter) => [...reasonCodeQueryKeys.all, 'list', filter ?? {}] as const,
  detail: (id: string) => [...reasonCodeQueryKeys.all, 'detail', id] as const,
};
