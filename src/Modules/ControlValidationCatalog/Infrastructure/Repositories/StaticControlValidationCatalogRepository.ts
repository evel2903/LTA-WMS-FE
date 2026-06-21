import type { IControlValidationCatalogRepository } from '@modules/ControlValidationCatalog/Application/Interfaces/IControlValidationCatalogRepository';
import { CONTROL_VALIDATION_SEED_CATALOG } from '@modules/ControlValidationCatalog/Domain/Constants/ControlValidationSeedCatalog';
import type { ControlValidationCatalog } from '@modules/ControlValidationCatalog/Domain/Entities/ControlValidationCatalog';

export class StaticControlValidationCatalogRepository implements IControlValidationCatalogRepository {
  getCatalog(): Promise<ControlValidationCatalog> {
    return Promise.resolve({
      validationRules: [...CONTROL_VALIDATION_SEED_CATALOG.validationRules],
      controlExceptions: [...CONTROL_VALIDATION_SEED_CATALOG.controlExceptions],
    });
  }
}
