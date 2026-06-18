import { useState } from 'react';

import { Card, CardContent, CardHeader, CardTitle } from '@shared/Components/Ui/Card';
import { useRulePreview } from '@modules/WarehouseProfile/Application/Commands/UseRulePreview';
import { toMutationErrorMessage } from '@modules/WarehouseProfile/Application/Commands/WarehouseProfileMutationError';
import type { WarehouseProfile } from '@modules/WarehouseProfile/Domain/Entities/WarehouseProfile';
import type { RulePreview } from '@modules/WarehouseProfile/Domain/Entities/RulePreview';
import { RulePreviewPanel } from '@modules/WarehouseProfile/Presentation/Components/RulePreviewPanel';
import { buildPreviewFormDefaults } from '@modules/WarehouseProfile/Presentation/Forms/WarehouseProfileFormSchema';
import { PreviewContextForm } from '@modules/WarehouseProfile/Presentation/Forms/PreviewContextForm';

interface ProfilePreviewPanelProps {
  profile: WarehouseProfile;
  /** When false the form is read-only (e.g. the catalog/preview is permission-denied). */
  canPreview?: boolean;
}

/**
 * "Preview this profile" scope self-check (Open Question 5): pre-fills the preview
 * context form from the selected profile's six-axis scope and runs `POST
 * /rules/preview` so the admin sees how rules resolve for that scope BEFORE
 * activating. By scope, never by id (contract divergence — see Dev Notes); the BE
 * resolves the most-specific ACTIVE profile. FE never resolves anything itself
 * (architecture 8.2) — it only renders the returned `RulePreview`.
 */
export function ProfilePreviewPanel({ profile, canPreview = true }: ProfilePreviewPanelProps) {
  const [preview, setPreview] = useState<RulePreview | null>(null);
  const [previewError, setPreviewError] = useState<string | undefined>(undefined);
  const previewMutation = useRulePreview();

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Preview this profile (scope self-check)</CardTitle>
        </CardHeader>
        <CardContent>
          <PreviewContextForm
            // Remount when the selected profile changes so its scope re-seeds the form defaults.
            key={`preview-${profile.id}`}
            disabled={!canPreview}
            pending={previewMutation.isPending}
            initialValue={buildPreviewFormDefaults(profile)}
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
  );
}
