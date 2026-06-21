import type { MasterDataStatus } from '@modules/InventoryStatus/Domain/Enums/InventoryStatusEnums';

export interface PagedDto<TItem> {
  Items: TItem[];
  Meta: { Page: number; PageSize: number; TotalItems: number; TotalPages: number };
}

export interface InventoryStatusDto {
  Id: string;
  StatusCode: string;
  DisplayName: string;
  StageGroup: string;
  AllowsAllocation: boolean;
  AllowsPick: boolean;
  Hold: boolean;
  IsTerminal: boolean;
  IsMilestone: boolean;
  SortOrder: number;
  Status: MasterDataStatus;
  SourceSystem: string | null;
  ReferenceId: string | null;
  UpdatedAt: string | null;
}

// ── Request DTO (PascalCase) ──────────────────────────────────────────────────

/**
 * `PATCH /inventory-statuses/:id` — only behaviour flags are editable; `ReasonCode` is required
 * (server-validated against the C3 catalog for (Update, InventoryStatus)). All flags optional
 * with OMIT semantics; `forbidNonWhitelisted` rejects any non-listed key.
 */
export interface UpdateInventoryStatusRequestDto {
  AllowsAllocation?: boolean;
  AllowsPick?: boolean;
  Hold?: boolean;
  IsTerminal?: boolean;
  IsMilestone?: boolean;
  SortOrder?: number;
  Status?: MasterDataStatus;
  ReasonCode: string;
}
