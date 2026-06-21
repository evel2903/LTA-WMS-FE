/**
 * Inventory-status enums mirrored verbatim from the backend wire contract (C14 MasterData).
 * `MasterDataStatus` is mixed-case on the wire (Active/Inactive) — unlike the UPPER reason-code
 * statuses — so match the BE `MasterDataStatus` enum exactly.
 */

export type MasterDataStatus = 'Active' | 'Inactive';

export const MASTER_DATA_STATUSES: MasterDataStatus[] = ['Active', 'Inactive'];
