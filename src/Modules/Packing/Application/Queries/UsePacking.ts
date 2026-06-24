import { useQuery } from '@tanstack/react-query';
import { packingQueryKeys } from '@modules/Packing/Application/Queries/PackingQueryKeys';
import type { PackageListFilter } from '@modules/Packing/Domain/Types/PackingQuery';
import { packingRepository } from '@modules/Packing/Infrastructure/Repositories/PackingRepositoryInstance';

export function usePackages(filter: PackageListFilter = {}) {
  return useQuery({
    queryKey: packingQueryKeys.list(filter),
    queryFn: () => packingRepository.list(filter),
  });
}

export function usePackage(id: string | null) {
  return useQuery({
    queryKey: packingQueryKeys.detail(id ?? ''),
    queryFn: () => packingRepository.getById(id as string),
    enabled: Boolean(id),
  });
}
