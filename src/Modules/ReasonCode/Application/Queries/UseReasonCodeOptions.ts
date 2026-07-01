import { useMemo } from 'react';

import { useReasonCodes } from '@modules/ReasonCode/Application/Queries/UseReasonCodeQueries';
import type { ReasonCodeFilter } from '@modules/ReasonCode/Domain/Types/ReasonCodeTypes';

/** A `{ value, label }` pair for a `<select>` option — kept framework-agnostic (no UI import). */
interface ReasonCodeOption {
  value: string;
  label: string;
}

/**
 * Reason-code dropdown options from the ReasonCode catalog. Defaults to ACTIVE only (pageSize 100);
 * pass `{ action: 'Override' }` (or `reasonGroup`) to narrow per context. Option value is the
 * `reasonCode` string because the BE accepts the code, not the id.
 */
export function useReasonCodeOptions(filter: ReasonCodeFilter = {}) {
  const query = useReasonCodes({ status: 'ACTIVE', pageSize: 100, ...filter });
  const isPlaceholderData = query.isPlaceholderData === true;
  const options = useMemo<ReasonCodeOption[]>(
    () =>
      isPlaceholderData
        ? []
        : (query.data?.items ?? []).map((reasonCode) => ({
            value: reasonCode.reasonCode,
            label: reasonCode.description
              ? `${reasonCode.reasonCode} — ${reasonCode.description}`
              : reasonCode.reasonCode,
          })),
    [isPlaceholderData, query.data?.items],
  );

  return { options, isLoading: query.isLoading || isPlaceholderData, isError: query.isError };
}
