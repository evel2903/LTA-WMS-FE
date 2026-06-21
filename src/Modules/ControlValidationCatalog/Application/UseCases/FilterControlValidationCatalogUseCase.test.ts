import { describe, expect, it } from 'vitest';

import { CONTROL_VALIDATION_SEED_CATALOG } from '@modules/ControlValidationCatalog/Domain/Constants/ControlValidationSeedCatalog';
import { FilterControlValidationCatalogUseCase } from '@modules/ControlValidationCatalog/Application/UseCases/FilterControlValidationCatalogUseCase';

describe('FilterControlValidationCatalogUseCase', () => {
  it('keeps the C8 seed complete (AC1/AC5)', () => {
    expect(CONTROL_VALIDATION_SEED_CATALOG.validationRules).toHaveLength(10);
    expect(CONTROL_VALIDATION_SEED_CATALOG.controlExceptions).toHaveLength(9);
    expect(CONTROL_VALIDATION_SEED_CATALOG.validationRules.map((item) => item.code)).toContain(
      'RBAC-VAL-10',
    );
    expect(CONTROL_VALIDATION_SEED_CATALOG.controlExceptions.map((item) => item.code)).toContain(
      'CTRL-EX-09',
    );
  });

  it('filters across code, linked control exception metadata, and deferred status (AC1/AC3)', () => {
    const useCase = new FilterControlValidationCatalogUseCase();

    const byCode = useCase.execute({
      catalog: CONTROL_VALIDATION_SEED_CATALOG,
      search: 'rbac-val-04',
    });
    expect(byCode.validationRules.map((item) => item.code)).toEqual(['RBAC-VAL-04']);

    const byLinkedSeverity = useCase.execute({
      catalog: CONTROL_VALIDATION_SEED_CATALOG,
      search: 'DataScopeViolation',
    });
    expect(byLinkedSeverity.validationRules.map((item) => item.code)).toEqual(['RBAC-VAL-02']);

    const byDeferred = useCase.execute({
      catalog: CONTROL_VALIDATION_SEED_CATALOG,
      search: 'DeferredV1Plus',
    });
    expect(byDeferred.controlExceptions.map((item) => item.code)).toEqual([
      'CTRL-EX-06',
      'CTRL-EX-07',
      'CTRL-EX-09',
    ]);
  });
});
