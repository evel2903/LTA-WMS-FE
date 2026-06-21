export type CatalogImplementationStatus = 'Implemented' | 'DeferredToC9' | 'DeferredV1Plus';

export type ControlExceptionSeverity = 'High' | 'Medium';

export type ControlExceptionDefaultState = 'Blocked' | 'Escalated' | 'Warned' | 'Detected';

export interface ValidationRuleCatalogItem {
  code: string;
  description: string;
  trigger: string;
  expectedResult: string;
  ownerModule: string;
  controlExceptionCode: string | null;
  implementationStatus: CatalogImplementationStatus;
}

export interface ControlExceptionCatalogItem {
  code: string;
  scenario: string;
  category: string;
  severity: ControlExceptionSeverity;
  defaultState: ControlExceptionDefaultState;
  actionAllowed: string;
  reasonRequired: boolean;
  evidenceRequired: boolean;
  approvalRequired: boolean;
  ownerRoles: string[];
  implementationStatus: CatalogImplementationStatus;
}

export interface ControlValidationCatalog {
  validationRules: ValidationRuleCatalogItem[];
  controlExceptions: ControlExceptionCatalogItem[];
}
