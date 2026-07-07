import type {
  ControlExceptionCatalogItem,
  ControlValidationCatalog,
  ValidationRuleCatalogItem,
} from '@modules/ControlValidationCatalog/Domain/Entities/ControlValidationCatalog';
import {
  catalogImplementationStatusLabel,
  controlActionAllowedLabel,
  controlCategoryLabel,
  controlDefaultStateLabel,
  controlSeverityLabel,
  requirementLabel,
} from '@modules/ControlValidationCatalog/Domain/Constants/ControlValidationCatalogDisplayText';

export interface FilterControlValidationCatalogInput {
  catalog: ControlValidationCatalog;
  search: string;
}

const normalize = (value: string) => value.trim().toLowerCase();

const containsQuery = (query: string, values: Array<string | null | undefined>) =>
  values.some((value) => value !== null && value !== undefined && normalize(value).includes(query));

const normalizeCode = (value: string | null | undefined) => value?.trim() ?? '';

export class FilterControlValidationCatalogUseCase {
  execute({ catalog, search }: FilterControlValidationCatalogInput): ControlValidationCatalog {
    const query = normalize(search);
    if (!query) {
      return catalog;
    }

    const exceptionsByCode = new Map(catalog.controlExceptions.map((item) => [normalizeCode(item.code), item]));

    return {
      validationRules: catalog.validationRules.filter((rule) =>
        this.matchesValidationRule(query, rule, exceptionsByCode.get(normalizeCode(rule.controlExceptionCode))),
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
      normalizeCode(rule.controlExceptionCode),
      rule.implementationStatus,
      catalogImplementationStatusLabel(rule.implementationStatus),
      linkedException?.category,
      linkedException ? controlCategoryLabel(linkedException.category) : undefined,
      linkedException?.severity,
      linkedException ? controlSeverityLabel(linkedException.severity) : undefined,
      linkedException?.defaultState,
      linkedException ? controlDefaultStateLabel(linkedException.defaultState) : undefined,
      linkedException?.ownerRoles.join(' '),
      linkedException?.reasonRequired ? 'reason required' : linkedException ? 'reason optional' : undefined,
      linkedException ? `lý do ${requirementLabel(linkedException.reasonRequired)}` : undefined,
      linkedException?.evidenceRequired ? 'evidence required' : linkedException ? 'evidence optional' : undefined,
      linkedException ? `bằng chứng ${requirementLabel(linkedException.evidenceRequired)}` : undefined,
      linkedException?.approvalRequired ? 'approval required' : linkedException ? 'approval optional' : undefined,
      linkedException ? `phê duyệt ${requirementLabel(linkedException.approvalRequired)}` : undefined,
    ]);
  }

  private matchesControlException(query: string, item: ControlExceptionCatalogItem): boolean {
    return containsQuery(query, [
      item.code,
      item.scenario,
      item.category,
      controlCategoryLabel(item.category),
      item.severity,
      controlSeverityLabel(item.severity),
      item.defaultState,
      controlDefaultStateLabel(item.defaultState),
      item.actionAllowed,
      controlActionAllowedLabel(item.actionAllowed),
      item.ownerRoles.join(' '),
      item.implementationStatus,
      catalogImplementationStatusLabel(item.implementationStatus),
      item.reasonRequired ? 'reason required' : 'reason optional',
      `lý do ${requirementLabel(item.reasonRequired)}`,
      item.evidenceRequired ? 'evidence required' : 'evidence optional',
      `bằng chứng ${requirementLabel(item.evidenceRequired)}`,
      item.approvalRequired ? 'approval required' : 'approval optional',
      `phê duyệt ${requirementLabel(item.approvalRequired)}`,
    ]);
  }
}
