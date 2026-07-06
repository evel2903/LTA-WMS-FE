import { Alert, AlertDescription, AlertTitle } from '@shared/Components/Reui/alert';
import type { WarehouseProfileAssignment } from '@modules/WarehouseProfile/Domain/Entities/WarehouseProfileAssignment';
import type { AssignmentFormValues } from '@modules/WarehouseProfile/Presentation/Forms/WarehouseProfileFormSchema';
import { AssignmentForm } from '@modules/WarehouseProfile/Presentation/Forms/AssignmentForm';
import { viAssignmentTypeLabel } from '@modules/WarehouseProfile/Presentation/Constants/WarehouseProfileDisplayText';

interface ProfileAssignmentPanelProps {
  assignments: WarehouseProfileAssignment[];
  canEdit?: boolean;
  pending?: boolean;
  conflict?: string;
  onCreate: (values: AssignmentFormValues) => void;
}

function firstKnownTarget(assignment: WarehouseProfileAssignment): string | null {
  return assignment.warehouseId?.trim() || assignment.warehouseTypeCode?.trim() || null;
}

function assignmentTargetLabel(assignment: WarehouseProfileAssignment): {
  text: string;
  isWarning: boolean;
} {
  switch (assignment.assignmentType as string) {
    case 'WAREHOUSE':
      return {
        text: assignment.warehouseId?.trim() || 'Thiếu mã kho',
        isWarning: !assignment.warehouseId?.trim(),
      };
    case 'WAREHOUSE_TYPE':
      return {
        text: assignment.warehouseTypeCode?.trim() || 'Thiếu mã loại kho',
        isWarning: !assignment.warehouseTypeCode?.trim(),
      };
    default:
      return {
        text: firstKnownTarget(assignment) ?? 'Loại gán chưa hỗ trợ',
        isWarning: true,
      };
  }
}

export function ProfileAssignmentPanel({
  assignments,
  canEdit = true,
  pending = false,
  conflict,
  onCreate,
}: ProfileAssignmentPanelProps) {
  return (
    <div className="space-y-3">
      <p className="text-sm font-medium">Phạm vi gán</p>
      {!canEdit && (
        <Alert variant="warning" role="status">
          <AlertTitle>Chỉ đọc</AlertTitle>
          <AlertDescription>Bạn không có quyền thêm hoặc gỡ phạm vi gán.</AlertDescription>
        </Alert>
      )}
      {assignments.length === 0 ? (
        <Alert variant="info" role="status">
          <AlertDescription>Chưa có gán nào.</AlertDescription>
        </Alert>
      ) : (
        <ul className="space-y-1 text-sm">
          {assignments.map((assignment) => {
            const target = assignmentTargetLabel(assignment);
            return (
              <li key={assignment.id} className="min-w-0 rounded-md border px-3 py-1 break-words">
                <span className="inline-block min-w-0 break-words font-medium">
                  {viAssignmentTypeLabel(assignment.assignmentType)}
                </span>{' '}
                <span
                  className={`inline-block min-w-0 break-words ${
                    target.isWarning ? 'text-warning' : 'text-muted-foreground'
                  }`}
                >
                  {target.text}
                </span>
              </li>
            );
          })}
        </ul>
      )}
      <AssignmentForm
        disabled={!canEdit}
        pending={pending}
        conflict={conflict}
        onSubmit={onCreate}
      />
    </div>
  );
}
