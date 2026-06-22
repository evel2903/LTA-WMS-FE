import { useQuery } from '@tanstack/react-query';

import { partnerQueryKeys } from '@modules/PartnerMaster/Application/Queries/PartnerQueryKeys';
import type {
  PartnerListFilter,
  ResolvePartnerByReferenceInput,
} from '@modules/PartnerMaster/Domain/Types/PartnerQuery';
import { partnerRepository } from '@modules/PartnerMaster/Infrastructure/Repositories/PartnerRepositoryInstance';

export function usePartners(filter: PartnerListFilter = {}) {
  return useQuery({
    queryKey: partnerQueryKeys.list(filter),
    queryFn: () => partnerRepository.list(filter),
  });
}

export function usePartner(id: string | null) {
  return useQuery({
    queryKey: partnerQueryKeys.detail(id ?? ''),
    queryFn: () => partnerRepository.getById(id as string),
    enabled: Boolean(id),
  });
}

export function useResolvePartnerByReference(input: ResolvePartnerByReferenceInput | null) {
  return useQuery({
    queryKey: input ? partnerQueryKeys.resolve(input) : partnerQueryKeys.resolve({
      partnerType: 'Supplier',
      sourceSystem: '',
      externalReference: '',
    }),
    queryFn: () => partnerRepository.resolveByReference(input as ResolvePartnerByReferenceInput),
    enabled: Boolean(input),
  });
}
