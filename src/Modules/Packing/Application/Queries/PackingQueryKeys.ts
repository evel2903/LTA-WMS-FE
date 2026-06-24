import { QUERY_NAMESPACES } from '@shared/Constants/QueryKeys';
import type { PackageListFilter } from '@modules/Packing/Domain/Types/PackingQuery';

export const packingQueryKeys = {
  all: [QUERY_NAMESPACES.PACKING] as const,
  lists: () => [...packingQueryKeys.all, 'list'] as const,
  list: (filter: PackageListFilter) => [...packingQueryKeys.lists(), filter] as const,
  details: () => [...packingQueryKeys.all, 'detail'] as const,
  detail: (id: string) => [...packingQueryKeys.details(), id] as const,
};
