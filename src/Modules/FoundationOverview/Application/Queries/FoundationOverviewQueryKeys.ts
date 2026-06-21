import { QUERY_NAMESPACES } from '@shared/Constants/QueryKeys';

export const foundationOverviewQueryKeys = {
  all: [QUERY_NAMESPACES.FOUNDATION_OVERVIEW] as const,
  overview: () => [...foundationOverviewQueryKeys.all, 'overview'] as const,
};
