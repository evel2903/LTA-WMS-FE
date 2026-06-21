import type {
  ActionCode,
  ObjectType,
  ReasonCodeStatus,
  ReasonGroup,
  RoleCode,
} from '@modules/ReasonCode/Domain/Enums/ReasonCodeEnums';

/** Whitelisted query filter for `GET /reason-codes`. */
export interface ReasonCodeFilter {
  page?: number;
  pageSize?: number;
  reasonGroup?: ReasonGroup;
  status?: ReasonCodeStatus;
  action?: ActionCode;
}

/** Create input for `POST /reason-codes` (Status/Version are server-forced). */
export interface CreateReasonCodeInput {
  reasonCode: string;
  reasonGroup: ReasonGroup;
  description?: string | null;
  appliesToActions: ActionCode[];
  appliesToObjects: ObjectType[];
  evidenceRequired?: boolean;
  approvalRequired?: boolean;
  allowedRoleCodes?: RoleCode[] | null;
  effectiveFrom?: string | null;
  effectiveTo?: string | null;
}

/**
 * Update input for `PATCH /reason-codes/:id` — partial; OMIT semantics. `reasonCode`
 * is immutable (not present). Status can flip ACTIVE<->INACTIVE (deactivation).
 */
export interface UpdateReasonCodeInput {
  reasonGroup?: ReasonGroup;
  description?: string | null;
  appliesToActions?: ActionCode[];
  appliesToObjects?: ObjectType[];
  evidenceRequired?: boolean;
  approvalRequired?: boolean;
  allowedRoleCodes?: RoleCode[] | null;
  status?: ReasonCodeStatus;
  effectiveFrom?: string | null;
  effectiveTo?: string | null;
}
