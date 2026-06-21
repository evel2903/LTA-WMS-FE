import type { PaginatedResponse } from '@shared/Types/Api';
import type { OverrideLog } from '@modules/OverrideLog/Domain/Entities/OverrideLog';
import type { OverrideLogFilter } from '@modules/OverrideLog/Domain/Types/OverrideLogTypes';

/**
 * Application port for the override log (C7). Read-only — the override-log lookup screen never
 * creates/edits/deletes (overrides are recorded by the business flow, not from this surface).
 */
export interface IOverrideLogRepository {
  list(filter?: OverrideLogFilter): Promise<PaginatedResponse<OverrideLog>>;
  getById(id: string): Promise<OverrideLog>;
}
