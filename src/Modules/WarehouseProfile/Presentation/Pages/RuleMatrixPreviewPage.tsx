import { useState } from 'react';

import { ROUTES } from '@app/Config/Routes';
import { Card, CardContent, CardHeader, CardTitle } from '@shared/Components/Ui/Card';
import { DetailPageShell } from '@shared/Components/Page/DetailPageShell';
import { useRulePreview } from '@modules/WarehouseProfile/Application/Commands/UseRulePreview';
import { toMutationErrorMessage } from '@modules/WarehouseProfile/Application/Commands/WarehouseProfileMutationError';
import type { RulePreview } from '@modules/WarehouseProfile/Domain/Entities/RulePreview';
import { RulePreviewPanel } from '@modules/WarehouseProfile/Presentation/Components/RulePreviewPanel';
import { PreviewContextForm } from '@modules/WarehouseProfile/Presentation/Forms/PreviewContextForm';

export function RuleMatrixPreviewPage() {
  const [preview, setPreview] = useState<RulePreview | null>(null);
  const [previewError, setPreviewError] = useState<string | undefined>(undefined);
  const previewMutation = useRulePreview();

  return (
    <DetailPageShell
      title="Preview quy tắc"
      subtitle="Đánh giá ngữ cảnh bằng rule engine hiện có mà không đổi contract hồ sơ kho."
      backTo={ROUTES.FOUNDATION.RULE_MATRIX}
      backLabel="Quay lại ma trận quy tắc"
      contentClassName="grid gap-4 lg:grid-cols-[minmax(0,420px)_1fr]"
    >
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Ngữ cảnh preview</CardTitle>
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
    </DetailPageShell>
  );
}
