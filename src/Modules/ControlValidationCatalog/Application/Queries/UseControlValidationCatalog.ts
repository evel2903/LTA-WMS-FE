import { useQuery } from '@tanstack/react-query';

import { controlValidationCatalogQueryKeys } from '@modules/ControlValidationCatalog/Application/Queries/ControlValidationCatalogQueryKeys';
import { controlValidationCatalogRepository } from '@modules/ControlValidationCatalog/Infrastructure/Repositories/ControlValidationCatalogRepositoryInstance';

export function useControlValidationCatalog() {
  return useQuery({
    queryKey: controlValidationCatalogQueryKeys.catalog(),
    queryFn: () => controlValidationCatalogRepository.getCatalog(),
    staleTime: Infinity,
  });
}
