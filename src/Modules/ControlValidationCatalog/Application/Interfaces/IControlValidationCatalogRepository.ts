import type { ControlValidationCatalog } from '@modules/ControlValidationCatalog/Domain/Entities/ControlValidationCatalog';

export interface IControlValidationCatalogRepository {
  getCatalog(): Promise<ControlValidationCatalog>;
}
