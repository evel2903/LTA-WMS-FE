import { QUERY_NAMESPACES } from '@shared/Constants/QueryKeys';

/** Module-scoped query keys. All Auth cache entries hang off this root. */
export const authQueryKeys = {
  all: [QUERY_NAMESPACES.AUTH] as const,
  me: () => [...authQueryKeys.all, 'me'] as const,
};
