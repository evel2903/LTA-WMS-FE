import { Link } from 'react-router-dom';

import { ROUTES } from '@app/Config/Routes';
import { ApiError } from '@shared/Services/Http/ApiError';
import { Button } from '@shared/Components/Ui/Button';
import { ListPageShell } from '@shared/Components/Page/ListPageShell';
import type { PageBoundaryState } from '@shared/Components/Page/PageStateBoundary';
import {
  useRuleDefinitions,
  useRuleGroups,
} from '@modules/WarehouseProfile/Application/Queries/UseRuleCatalog';
import { PRECEDENCE_ORDER } from '@modules/WarehouseProfile/Domain/Constants/PrecedenceOrder';
import { PrecedenceMatrix } from '@modules/WarehouseProfile/Presentation/Components/PrecedenceMatrix';

function matrixState(params: {
  denied: boolean;
  loading: boolean;
  error: boolean;
}): PageBoundaryState | null {
  if (params.denied) return 'forbidden';
  if (params.loading) return 'loading';
  if (params.error) return 'error';
  return null;
}

export function RuleMatrixPage() {
  const groupsQuery = useRuleGroups();
  const rulesQuery = useRuleDefinitions();

  const groupsError = groupsQuery.error instanceof ApiError ? groupsQuery.error : null;
  const rulesError = rulesQuery.error instanceof ApiError ? rulesQuery.error : null;
  const catalogDenied = Boolean(groupsError?.isForbidden || rulesError?.isForbidden);
  const catalogLoading = groupsQuery.isLoading || rulesQuery.isLoading;
  const catalogErrored = Boolean(groupsQuery.error || rulesQuery.error) && !catalogDenied;
  const state = matrixState({
    denied: catalogDenied,
    loading: catalogLoading,
    error: catalogErrored,
  });

  return (
    <ListPageShell
      title="Rule Matrix"
      description="Review the fixed precedence tiers. Rule preview runs on a dedicated action page."
      toolbar={
        <Button asChild>
          <Link to={ROUTES.FOUNDATION.RULE_MATRIX_PREVIEW}>Open preview</Link>
        </Button>
      }
      state={state}
      stateTitle={state === 'forbidden' ? 'Permission denied' : undefined}
      stateMessage={groupsError?.message ?? rulesError?.message ?? 'Unable to load rules.'}
    >
      <PrecedenceMatrix
        tiers={PRECEDENCE_ORDER}
        rules={rulesQuery.data?.items ?? []}
        groups={groupsQuery.data?.items ?? []}
      />
    </ListPageShell>
  );
}
