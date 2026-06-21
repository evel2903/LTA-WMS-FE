import { QUERY_NAMESPACES } from '@shared/Constants/QueryKeys';
import type { OverrideLogFilter } from '@modules/OverrideLog/Domain/Types/OverrideLogTypes';

export const overrideLogQueryKeys = {
  all: [QUERY_NAMESPACES.OVERRIDE_LOG] as const,
  list: (filter?: OverrideLogFilter) => [...overrideLogQueryKeys.all, 'logs', filter ?? {}] as const,
  detail: (id: string) => [...overrideLogQueryKeys.all, 'log', id] as const,
};
