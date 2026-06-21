import type {
  ControlExceptionCatalogItem,
  ControlValidationCatalog,
  ValidationRuleCatalogItem,
} from '@modules/ControlValidationCatalog/Domain/Entities/ControlValidationCatalog';

export interface FilterControlValidationCatalogInput {
  catalog: ControlValidationCatalog;
  search: string;
}

const normalize = (value: string) => value.trim().toLowerCase();

const containsQuery = (query: string, values: Array<string | null | undefined>) =>
  values.some((value) => value !== null && value !== undefined && normalize(value).includes(query));

export class FilterControlValidationCatalogUseCase {
  execute({ catalog, search }: FilterControlValidationCatalogInput): ControlValidationCatalog {
    const query = normalize(search);
    if (!query) {
      return catalog;
    }

    const exceptionsByCode = new Map(catalog.controlExceptions.map((item) => [item.code, item]));

    return {
      validationRules: catalog.validationRules.filter((rule) =>
        this.matchesValidationRule(query, rule, exceptionsByCode.get(rule.controlExceptionCode ?? '')),
      ),
      controlExceptions: catalog.controlExceptions.filter((exception) =>
        this.matchesControlException(query, exception),
      ),
    };
  }

  private matchesValidationRule(
    query: string,
    rule: ValidationRuleCatalogItem,
    linkedException?: ControlExceptionCatalogItem,
  ): boolean {
    return containsQuery(query, [
      rule.code,
      rule.description,
      rule.trigger,
      rule.expectedResult,
      rule.ownerModule,
      rule.controlExceptionCode,
      rule.implementationStatus,
      linkedException?.category,
      linkedException?.severity,
      linkedException?.defaultState,
      linkedException?.ownerRoles.join(' '),
    ]);
  }

  private matchesControlException(query: string, item: ControlExceptionCatalogItem): boolean {
    return containsQuery(query, [
      item.code,
      item.scenario,
      item.category,
      item.severity,
      item.defaultState,
      item.actionAllowed,
      item.ownerRoles.join(' '),
      item.implementationStatus,
      item.reasonRequired ? 'reason required' : 'reason optional',
      item.evidenceRequired ? 'evidence required' : 'evidence optional',
      item.approvalRequired ? 'approval required' : 'approval optional',
    ]);
  }
}
