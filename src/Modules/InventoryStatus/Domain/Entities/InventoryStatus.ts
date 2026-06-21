import type { MasterDataStatus } from '@modules/InventoryStatus/Domain/Enums/InventoryStatusEnums';

/**
 * An inventory-status catalog entry (C14). Behaviour flags (allows-allocation / allows-pick /
 * hold / terminal / milestone) are edited via a controlled, reason-required update; the code /
 * name / stage-group identify the status and are not edited from this screen. `updatedAt`
 * discriminates re-reads after a PATCH (there is no version field on the BE DTO).
 */
export interface InventoryStatus {
  id: string;
  statusCode: string;
  displayName: string;
  stageGroup: string;
  allowsAllocation: boolean;
  allowsPick: boolean;
  hold: boolean;
  isTerminal: boolean;
  isMilestone: boolean;
  sortOrder: number;
  status: MasterDataStatus;
  sourceSystem: string | null;
  referenceId: string | null;
  updatedAt: string | null;
}
