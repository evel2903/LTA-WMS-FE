import { useState } from 'react';

import { Button } from '@shared/Components/Ui/Button';
import { Input } from '@shared/Components/Ui/Input';
import { Alert, AlertDescription, AlertTitle } from '@shared/Components/Reui/alert';
import { ReasonCodeSelect } from '@modules/ReasonCode/Presentation/Components/ReasonCodeSelect';
import type {
  ActivateWarehouseProfileInput,
  DeactivateWarehouseProfileInput,
} from '@modules/WarehouseProfile/Domain/Types/WarehouseProfileInputs';
import type { WarehouseProfileStatus } from '@modules/WarehouseProfile/Domain/Enums/WarehouseProfileEnums';

interface ProfileLifecycleActionsProps {
  status: WarehouseProfileStatus;
  /** Whether the user may run lifecycle actions; false => disabled + read-only label. */
  canManage?: boolean;
  pending?: boolean;
  /** Distinct 409-conflict message (overlap / serious conflict on activate) — AC5. */
  conflictMessage?: string;
  /** Non-conflict validation / business-rule message from the backend. */
  errorMessage?: string;
  onActivate: (input: ActivateWarehouseProfileInput) => void;
  onDeactivate: (input: DeactivateWarehouseProfileInput) => void;
}

/**
 * Activate / deactivate controls with reason context (reasonCode is canonical;
 * reasonNote is a secondary note). FE does NOT enforce a reason catalog or any
 * permission rule — it only passes metadata and reflects backend responses.
 */
export function ProfileLifecycleActions({
  status,
  canManage = true,
  pending = false,
  conflictMessage,
  errorMessage,
  onActivate,
  onDeactivate,
}: ProfileLifecycleActionsProps) {
  const [reasonCode, setReasonCode] = useState('');
  const [reasonNote, setReasonNote] = useState('');
  const reason = { reasonCode: reasonCode || undefined, reasonNote: reasonNote || undefined };

  return (
    <div className="space-y-3">
      {!canManage && (
        <Alert variant="warning" role="status">
          <AlertTitle>Chỉ đọc</AlertTitle>
          <AlertDescription>Bạn không có quyền thực hiện hành động vòng đời.</AlertDescription>
        </Alert>
      )}

      <ReasonCodeSelect
        id="warehouse-profile-lifecycle-reason-code"
        name="reasonCode"
        label="Mã lý do"
        value={reasonCode}
        action="Update"
        objectType="WarehouseProfile"
        optional
        disabled={!canManage}
        onChange={setReasonCode}
      />
      <label className="grid gap-1 text-sm">Ghi chú lý do<Input
          id="warehouse-profile-lifecycle-reason-note"
          name="reasonNote"
          disabled={!canManage}
          value={reasonNote}
          onChange={(event) => setReasonNote(event.target.value)}
          placeholder="Ghi chú tùy chọn"
        />
      </label>

      <div className="flex gap-2">
        <Button
          type="button"
          disabled={!canManage || pending || status === 'ACTIVE'}
          onClick={() => onActivate(reason)}
        >Kích hoạt</Button>
        <Button
          type="button"
          variant="outline"
          disabled={!canManage || pending || status !== 'ACTIVE'}
          onClick={() => onDeactivate(reason)}
        >Ngưng kích hoạt</Button>
      </div>

      {conflictMessage && (
        <Alert variant="destructive" role="alert">
          <AlertTitle>Xung đột</AlertTitle>
          <AlertDescription>
            <p>{conflictMessage}</p>
            <p>Hồ sơ chưa được thay đổi. Hãy xử lý phạm vi chồng lấn rồi thử lại.</p>
          </AlertDescription>
        </Alert>
      )}

      {!conflictMessage && errorMessage && (
        <Alert variant="destructive" role="alert">
          <AlertDescription>{errorMessage}</AlertDescription>
        </Alert>
      )}
    </div>
  );
}
