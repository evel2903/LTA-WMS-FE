import { useState } from 'react';

import { ApiError } from '@shared/Services/Http/ApiError';
import { Card, CardContent, CardHeader, CardTitle } from '@shared/Components/Ui/Card';
import { useRulePreview } from '@modules/WarehouseProfile/Application/Commands/UseRulePreview';
import { toMutationErrorMessage } from '@modules/WarehouseProfile/Application/Commands/WarehouseProfileMutationError';
import {
  useRuleDefinitions,
  useRuleGroups,
} from '@modules/WarehouseProfile/Application/Queries/UseRuleCatalog';
import { PRECEDENCE_ORDER } from '@modules/WarehouseProfile/Domain/Constants/PrecedenceOrder';
import type { RulePreview } from '@modules/WarehouseProfile/Domain/Entities/RulePreview';
import { PrecedenceMatrix } from '@modules/WarehouseProfile/Presentation/Components/PrecedenceMatrix';
import { RulePreviewPanel } from '@modules/WarehouseProfile/Presentation/Components/RulePreviewPanel';
import { ProfileStateView } from '@modules/WarehouseProfile/Presentation/Components/StateViews';
import { PreviewContextForm } from '@modules/WarehouseProfile/Presentation/Forms/PreviewContextForm';

export function RuleMatrixPage() {
  const [preview, setPreview] = useState<RulePreview | null>(null);
  const [previewError, setPreviewError] = useState<string | undefined>(undefined);

  const groupsQuery = useRuleGroups();
  const rulesQuery = useRuleDefinitions();
  const previewMutation = useRulePreview();

  const groupsError = groupsQuery.error instanceof ApiError ? groupsQuery.error : null;
  const rulesError = rulesQuery.error instanceof ApiError ? rulesQuery.error : null;
  const catalogDenied = groupsError?.isForbidden || rulesError?.isForbidden;
  const catalogLoading = groupsQuery.isLoading || rulesQuery.isLoading;
  const catalogErrored = Boolean(groupsQuery.error || rulesQuery.error) && !catalogDenied;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Rule Matrix</h1>
        <p className="text-muted-foreground">
          Six precedence tiers in fixed order (Compliance is highest). Resolution is decided by the
          backend; use the preview to see how a context resolves.
        </p>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1fr_400px]">
        <div>
          {catalogDenied ? (
            <ProfileStateView state="denied" />
          ) : catalogLoading ? (
            <ProfileStateView state="loading" />
          ) : catalogErrored ? (
            <ProfileStateView
              state="error"
              errorMessage={groupsError?.message ?? rulesError?.message ?? 'Unable to load rules.'}
            />
          ) : (
            <PrecedenceMatrix
              tiers={PRECEDENCE_ORDER}
              rules={rulesQuery.data?.items ?? []}
              groups={groupsQuery.data?.items ?? []}
            />
          )}
        </div>

        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Preview context</CardTitle>
            </CardHeader>
            <CardContent>
              <PreviewContextForm
                pending={previewMutation.isPending}
                onSubmit={(values) => {
                  setPreviewError(undefined);
                  previewMutation.mutate(
                    {
                      warehouseTypeCode: values.warehouseTypeCode,
                      warehouseId: values.warehouseId || undefined,
                      zoneId: values.zoneId || undefined,
                      locationType: values.locationType || undefined,
                      ownerId: values.ownerId || undefined,
                      skuId: values.skuId || undefined,
                      itemClass: values.itemClass || undefined,
                      orderType: values.orderType || undefined,
                      customerId: values.customerId || undefined,
                      supplierId: values.supplierId || undefined,
                      reasonCode: values.reasonCode || undefined,
                      evaluatedAt: values.evaluatedAt || undefined,
                    },
                    {
                      onSuccess: (result) => setPreview(result),
                      onError: (error) => {
                        setPreview(null);
                        setPreviewError(toMutationErrorMessage(error));
                      },
                    },
                  );
                }}
              />
            </CardContent>
          </Card>

          <RulePreviewPanel
            preview={preview}
            loading={previewMutation.isPending}
            errorMessage={previewError}
          />
        </div>
      </div>
    </div>
  );
}
