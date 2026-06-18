import type { AssignmentType } from '@modules/WarehouseProfile/Domain/Enums/WarehouseProfileEnums';
import type { WarehouseProfileAuditFields } from '@modules/WarehouseProfile/Domain/Entities/WarehouseProfile';

export interface WarehouseProfileAssignment extends WarehouseProfileAuditFields {
  id: string;
  warehouseProfileId: string;
  assignmentType: AssignmentType;
  warehouseTypeCode: string | null;
  warehouseId: string | null;
  scopeKey: string;
}
