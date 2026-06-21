import { QUERY_NAMESPACES } from '@shared/Constants/QueryKeys';

export const controlValidationCatalogQueryKeys = {
  all: [QUERY_NAMESPACES.CONTROL_VALIDATION_CATALOG] as const,
  catalog: () => [...controlValidationCatalogQueryKeys.all, 'catalog'] as const,
};
