import { useState } from 'react';

import { Button } from '@shared/Components/Ui/Button';
import { Input } from '@shared/Components/Ui/Input';
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
      {!canManage && <p className="text-muted-foreground text-sm">Read only</p>}

      <label className="grid gap-1 text-sm">
        Reason code
        <Input
          disabled={!canManage}
          value={reasonCode}
          onChange={(event) => setReasonCode(event.target.value)}
          placeholder="e.g. POLICY_CHANGE"
        />
      </label>
      <label className="grid gap-1 text-sm">
        Reason note
        <Input
          disabled={!canManage}
          value={reasonNote}
          onChange={(event) => setReasonNote(event.target.value)}
          placeholder="Optional note"
        />
      </label>

      <div className="flex gap-2">
        <Button
          type="button"
          disabled={!canManage || pending || status === 'ACTIVE'}
          onClick={() => onActivate(reason)}
        >
          Activate
        </Button>
        <Button
          type="button"
          variant="outline"
          disabled={!canManage || pending || status !== 'ACTIVE'}
          onClick={() => onDeactivate(reason)}
        >
          Deactivate
        </Button>
      </div>

      {conflictMessage && (
        <div className="border-destructive/40 bg-destructive/5 rounded-md border p-3 text-sm" role="alert">
          <p className="text-destructive font-medium">Conflict</p>
          <p className="text-destructive">{conflictMessage}</p>
          <p className="text-muted-foreground mt-1 text-xs">
            The profile was not changed. Resolve the overlapping scope and try again.
          </p>
        </div>
      )}

      {!conflictMessage && errorMessage && (
        <p className="text-destructive text-sm" role="alert">
          {errorMessage}
        </p>
      )}
    </div>
  );
}
