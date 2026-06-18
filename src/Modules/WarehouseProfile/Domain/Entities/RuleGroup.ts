import type { RuleGroupCatalogState } from '@modules/WarehouseProfile/Domain/Enums/WarehouseProfileEnums';
import type { WarehouseProfileAuditFields } from '@modules/WarehouseProfile/Domain/Entities/WarehouseProfile';

export interface RuleGroup extends WarehouseProfileAuditFields {
  id: string;
  groupCode: string;
  groupName: string;
  description: string | null;
  catalogState: RuleGroupCatalogState;
  displayOrder: number | null;
}
