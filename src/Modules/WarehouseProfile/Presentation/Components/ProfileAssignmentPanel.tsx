import type { WarehouseProfileAssignment } from '@modules/WarehouseProfile/Domain/Entities/WarehouseProfileAssignment';
import type { AssignmentFormValues } from '@modules/WarehouseProfile/Presentation/Forms/WarehouseProfileFormSchema';
import { AssignmentForm } from '@modules/WarehouseProfile/Presentation/Forms/AssignmentForm';

interface ProfileAssignmentPanelProps {
  assignments: WarehouseProfileAssignment[];
  canEdit?: boolean;
  pending?: boolean;
  conflict?: string;
  onCreate: (values: AssignmentFormValues) => void;
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
      {assignments.length === 0 ? (
        <p className="text-muted-foreground text-sm">Chưa có gán nào.</p>
      ) : (
        <ul className="space-y-1 text-sm">
          {assignments.map((assignment) => (
            <li key={assignment.id} className="rounded-md border px-3 py-1">
              <span className="font-medium">{assignment.assignmentType}</span>{' '}
              <span className="text-muted-foreground">
                {assignment.assignmentType === 'WAREHOUSE'
                  ? assignment.warehouseId
                  : assignment.warehouseTypeCode}
              </span>
            </li>
          ))}
        </ul>
      )}
      <AssignmentForm disabled={!canEdit} pending={pending} conflict={conflict} onSubmit={onCreate} />
    </div>
  );
}
