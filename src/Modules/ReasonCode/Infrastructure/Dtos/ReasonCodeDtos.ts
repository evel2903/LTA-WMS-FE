import type {
  ActionCode,
  ObjectType,
  ReasonCodeStatus,
  ReasonGroup,
  RoleCode,
} from '@modules/ReasonCode/Domain/Enums/ReasonCodeEnums';

export interface PagedDto<TItem> {
  Items: TItem[];
  Meta: { Page: number; PageSize: number; TotalItems: number; TotalPages: number };
}

export interface ReasonCodeDto {
  Id: string;
  ReasonCode: string;
  ReasonGroup: ReasonGroup;
  Description: string | null;
  AppliesToActions: ActionCode[];
  AppliesToObjects: ObjectType[];
  EvidenceRequired: boolean;
  ApprovalRequired: boolean;
  AllowedRoleCodes: RoleCode[] | null;
  Status: ReasonCodeStatus;
  Version: number;
  EffectiveFrom: string | null;
  EffectiveTo: string | null;
}

// ── Request DTOs (PascalCase) ─────────────────────────────────────────────────

export interface CreateReasonCodeRequestDto {
  ReasonCode: string;
  ReasonGroup: ReasonGroup;
  Description?: string;
  AppliesToActions: ActionCode[];
  AppliesToObjects: ObjectType[];
  EvidenceRequired?: boolean;
  ApprovalRequired?: boolean;
  AllowedRoleCodes?: RoleCode[];
  EffectiveFrom?: string;
  EffectiveTo?: string;
}

export interface UpdateReasonCodeRequestDto {
  ReasonGroup?: ReasonGroup;
  // null = clear (BE accepts null-to-clear on these optional fields).
  Description?: string | null;
  AppliesToActions?: ActionCode[];
  AppliesToObjects?: ObjectType[];
  EvidenceRequired?: boolean;
  ApprovalRequired?: boolean;
  AllowedRoleCodes?: RoleCode[] | null;
  Status?: ReasonCodeStatus;
  EffectiveFrom?: string | null;
  EffectiveTo?: string | null;
}
