import type {
  ActionCode,
  ObjectType,
  ReasonCodeStatus,
  ReasonGroup,
  RoleCode,
} from '@modules/ReasonCode/Domain/Enums/ReasonCodeEnums';

/** A reason-code catalog entry (C3). Audit fields are not exposed by the BE DTO. */
export interface ReasonCode {
  id: string;
  reasonCode: string;
  reasonGroup: ReasonGroup;
  description: string | null;
  appliesToActions: ActionCode[];
  appliesToObjects: ObjectType[];
  evidenceRequired: boolean;
  approvalRequired: boolean;
  allowedRoleCodes: RoleCode[] | null;
  status: ReasonCodeStatus;
  version: number;
  effectiveFrom: string | null;
  effectiveTo: string | null;
}
