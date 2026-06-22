import { QUERY_NAMESPACES } from '@shared/Constants/QueryKeys';
import type {
  PartnerListFilter,
  ResolvePartnerByReferenceInput,
} from '@modules/PartnerMaster/Domain/Types/PartnerQuery';

export const partnerQueryKeys = {
  all: [QUERY_NAMESPACES.PARTNER_MASTER] as const,
  lists: () => [...partnerQueryKeys.all, 'list'] as const,
  list: (filter?: PartnerListFilter) => [...partnerQueryKeys.lists(), filter ?? {}] as const,
  detail: (id: string) => [...partnerQueryKeys.all, 'detail', id] as const,
  resolve: (input: ResolvePartnerByReferenceInput) =>
    [...partnerQueryKeys.all, 'resolve', input] as const,
};
