import type { PaginatedResponse } from '@shared/Types/Api';
import type { ReasonCode } from '@modules/ReasonCode/Domain/Entities/ReasonCode';
import type {
  CreateReasonCodeInput,
  UpdateReasonCodeInput,
} from '@modules/ReasonCode/Domain/Types/ReasonCodeTypes';
import type {
  CreateReasonCodeRequestDto,
  PagedDto,
  ReasonCodeDto,
  UpdateReasonCodeRequestDto,
} from '@modules/ReasonCode/Infrastructure/Dtos/ReasonCodeDtos';

/** Strips nullish fields so CREATE payloads OMIT them; `false`/`0` survive. */
function removeEmpty<T extends Record<string, unknown>>(value: T): T {
  return Object.fromEntries(
    Object.entries(value).filter(([, item]) => item !== undefined && item !== null),
  ) as T;
}

/** Strips only `undefined` — keeps explicit `null` so PATCH can clear a nullable field. */
function stripUndefined<T extends Record<string, unknown>>(value: T): T {
  return Object.fromEntries(Object.entries(value).filter(([, item]) => item !== undefined)) as T;
}

/** Empty role list → undefined (omit) so we never send [] / null (no-restriction is the default). */
function roleList(roles: CreateReasonCodeInput['allowedRoleCodes']) {
  return roles && roles.length > 0 ? roles : undefined;
}

export const ReasonCodeMapper = {
  toPaged<TDto, TEntity>(
    dto: PagedDto<TDto>,
    mapper: (item: TDto) => TEntity,
  ): PaginatedResponse<TEntity> {
    const items = dto?.Items ?? [];
    const meta = dto?.Meta;
    return {
      items: items.map(mapper),
      page: meta?.Page ?? 1,
      pageSize: meta?.PageSize ?? 0,
      totalItems: meta?.TotalItems ?? 0,
      totalPages: meta?.TotalPages ?? 0,
    };
  },

  toReasonCode(dto: ReasonCodeDto): ReasonCode {
    return {
      id: dto.Id,
      reasonCode: dto.ReasonCode,
      reasonGroup: dto.ReasonGroup,
      description: dto.Description,
      appliesToActions: dto.AppliesToActions ?? [],
      appliesToObjects: dto.AppliesToObjects ?? [],
      evidenceRequired: dto.EvidenceRequired,
      approvalRequired: dto.ApprovalRequired,
      allowedRoleCodes: dto.AllowedRoleCodes,
      status: dto.Status,
      version: dto.Version,
      effectiveFrom: dto.EffectiveFrom,
      effectiveTo: dto.EffectiveTo,
    };
  },

  toCreateRequest(input: CreateReasonCodeInput): CreateReasonCodeRequestDto {
    return removeEmpty({
      ReasonCode: input.reasonCode,
      ReasonGroup: input.reasonGroup,
      Description: input.description,
      AppliesToActions: input.appliesToActions,
      AppliesToObjects: input.appliesToObjects,
      EvidenceRequired: input.evidenceRequired,
      ApprovalRequired: input.approvalRequired,
      AllowedRoleCodes: roleList(input.allowedRoleCodes),
      EffectiveFrom: input.effectiveFrom,
      EffectiveTo: input.effectiveTo,
    }) as CreateReasonCodeRequestDto;
  },

  /**
   * The edit form is a full snapshot, so a blanked optional field means "clear it".
   * Map empties to explicit `null` (BE applies null-to-clear for description / effective /
   * allowed-roles) and keep null through `stripUndefined`, so "empty = no restriction" works.
   */
  toUpdateRequest(input: UpdateReasonCodeInput): UpdateReasonCodeRequestDto {
    return stripUndefined({
      ReasonGroup: input.reasonGroup,
      Description: input.description === undefined ? undefined : (input.description || null),
      AppliesToActions: input.appliesToActions,
      AppliesToObjects: input.appliesToObjects,
      EvidenceRequired: input.evidenceRequired,
      ApprovalRequired: input.approvalRequired,
      AllowedRoleCodes:
        input.allowedRoleCodes === undefined
          ? undefined
          : input.allowedRoleCodes && input.allowedRoleCodes.length > 0
            ? input.allowedRoleCodes
            : null,
      Status: input.status,
      EffectiveFrom: input.effectiveFrom === undefined ? undefined : (input.effectiveFrom || null),
      EffectiveTo: input.effectiveTo === undefined ? undefined : (input.effectiveTo || null),
    });
  },
};
