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

    const byLinkedEvidenceLabel = useCase.execute({
      catalog: CONTROL_VALIDATION_SEED_CATALOG,
      search: 'bằng chứng bắt buộc',
    });
    expect(byLinkedEvidenceLabel.validationRules.map((item) => item.code)).toEqual([
      'RBAC-VAL-04',
      'RBAC-VAL-05',
    ]);

    const byDisplayedCategory = useCase.execute({
      catalog: CONTROL_VALIDATION_SEED_CATALOG,
      search: 'Sửa dữ liệu thủ công',
    });
    expect(byDisplayedCategory.controlExceptions.map((item) => item.code)).toEqual(['CTRL-EX-09']);

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

  it('matches linked exception metadata when CTRL-EX codes include surrounding whitespace', () => {
    const useCase = new FilterControlValidationCatalogUseCase();
    const catalog = {
      validationRules: [
        {
          ...CONTROL_VALIDATION_SEED_CATALOG.validationRules[0],
          controlExceptionCode: ' CTRL-EX-01 ',
        },
      ],
      controlExceptions: [
        {
          ...CONTROL_VALIDATION_SEED_CATALOG.controlExceptions[0],
          code: ' CTRL-EX-01 ',
        },
      ],
    };

    const result = useCase.execute({
      catalog,
      search: 'Từ chối phân quyền',
    });

    expect(result.validationRules.map((item) => item.code)).toEqual(['RBAC-VAL-01']);
  });
});
