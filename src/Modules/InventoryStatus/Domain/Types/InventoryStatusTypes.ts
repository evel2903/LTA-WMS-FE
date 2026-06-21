import type { MasterDataStatus } from '@modules/InventoryStatus/Domain/Enums/InventoryStatusEnums';

/** Whitelisted query filter for `GET /inventory-statuses`. */
export interface InventoryStatusFilter {
  page?: number;
  pageSize?: number;
  statusCode?: string;
  stageGroup?: string;
  status?: MasterDataStatus;
}

/**
 * Controlled update for `PATCH /inventory-statuses/:id` — only behaviour flags are editable
 * and a valid `reasonCode` is mandatory (ownership policy group InventoryStatus requires a
 * reason; resolved through the C3 catalog for (Update, InventoryStatus)). OMIT semantics:
 * an undefined flag is left untouched server-side.
 */
export interface UpdateInventoryStatusInput {
  allowsAllocation?: boolean;
  allowsPick?: boolean;
  hold?: boolean;
  isTerminal?: boolean;
  isMilestone?: boolean;
  sortOrder?: number;
  status?: MasterDataStatus;
  reasonCode: string;
}
