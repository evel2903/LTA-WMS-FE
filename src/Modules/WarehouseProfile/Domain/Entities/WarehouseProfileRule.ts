import type { WarehouseProfileAuditFields } from '@modules/WarehouseProfile/Domain/Entities/WarehouseProfile';

export interface WarehouseProfileRule extends WarehouseProfileAuditFields {
  id: string;
  warehouseProfileId: string;
  ruleDefinitionId: string;
  isEnabled: boolean;
  overridePriority: number | null;
}
