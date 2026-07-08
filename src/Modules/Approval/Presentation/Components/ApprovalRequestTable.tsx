import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@shared/Components/Ui/Table';
import type { ApprovalRequest } from '@modules/Approval/Domain/Entities/Approval';
import { ApprovalDecisionBadge } from '@modules/Approval/Presentation/Components/ApprovalDecisionBadge';
import {
  approvalActionLabel,
  firstNonBlankText,
  approvalNoteLabel,
  approvalTargetLabelFromParts,
} from '@modules/Approval/Presentation/Constants/ApprovalDisplayText';

interface ApprovalRequestTableProps {
  items: ApprovalRequest[];
  selectedId: string | null;
  onSelect: (item: ApprovalRequest) => void;
  isSelectionDisabled?: boolean;
}

export function ApprovalRequestTable({
  items,
  selectedId,
  onSelect,
  isSelectionDisabled = false,
}: ApprovalRequestTableProps) {
  return (
    <div className="min-w-0 space-y-3">
      <div className="hidden md:block">
        <Table
          aria-label="Danh sách yêu cầu phê duyệt dạng bảng"
          className="min-w-[820px] table-fixed"
        >
          <TableHeader>
            <TableRow>
              <TableHead className="w-[24%]">Đích</TableHead>
              <TableHead className="w-[14%]">Hành động</TableHead>
              <TableHead className="w-[18%]">Người yêu cầu</TableHead>
              <TableHead className="w-[14%]">Quyết định</TableHead>
              <TableHead className="w-[18%]">Lý do</TableHead>
              <TableHead className="w-[12%]">Tạo lúc</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.map((item) => {
              const isSelected = item.id === selectedId;
              const targetLabel = approvalTargetLabelFromParts(
                item.targetObjectType,
                item.targetObjectCode,
                item.targetObjectId,
              );
              const reasonLabel = approvalNoteLabel(
                firstNonBlankText(item.decisionNote, item.requestReasonNote),
              );

              return (
                <TableRow
                  key={item.id}
                  data-selected={isSelected}
                  data-state={isSelected ? 'selected' : undefined}
                >
                  <TableCell className="whitespace-normal break-words">
                    <button
                      type="button"
                      aria-label={`Mở chi tiết yêu cầu phê duyệt ${targetLabel}, hành động ${approvalActionLabel(item.action)}, người yêu cầu ${item.requesterUserId}, bản ghi ${item.id}`}
                      aria-current={isSelected ? 'true' : undefined}
                      className="break-words text-left underline-offset-2 hover:underline disabled:cursor-not-allowed disabled:opacity-60"
                      disabled={isSelectionDisabled}
                      onClick={() => onSelect(item)}
                    >
                      {targetLabel}
                    </button>
                    {isSelected && (
                      <span className="text-primary mt-1 block text-xs font-medium">Đang chọn</span>
                    )}
                  </TableCell>
                  <TableCell className="whitespace-normal break-words">
                    {approvalActionLabel(item.action)}
                  </TableCell>
                  <TableCell className="text-muted-foreground whitespace-normal break-words">
                    {item.requesterUserId}
                  </TableCell>
                  <TableCell className="whitespace-normal">
                    <ApprovalDecisionBadge decision={item.decision} />
                  </TableCell>
                  <TableCell className="text-muted-foreground whitespace-normal break-words">
                    {reasonLabel}
                  </TableCell>
                  <TableCell className="text-muted-foreground text-xs whitespace-normal">
                    {new Date(item.createdAt).toLocaleString()}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      <ul aria-label="Danh sách yêu cầu phê duyệt dạng thẻ" className="grid gap-2 md:hidden">
        {items.map((item) => {
          const isSelected = item.id === selectedId;
          const targetLabel = approvalTargetLabelFromParts(
            item.targetObjectType,
            item.targetObjectCode,
            item.targetObjectId,
          );
          const reasonLabel = approvalNoteLabel(
            firstNonBlankText(item.decisionNote, item.requestReasonNote),
          );

          return (
            <li
              key={item.id}
              data-selected={isSelected}
              className="min-w-0 rounded-md border p-3 data-[selected=true]:border-primary data-[selected=true]:bg-primary/5"
            >
              <button
                type="button"
                aria-label={`Mở chi tiết yêu cầu phê duyệt ${targetLabel}, hành động ${approvalActionLabel(item.action)}, người yêu cầu ${item.requesterUserId}, bản ghi ${item.id}`}
                aria-current={isSelected ? 'true' : undefined}
                className="block w-full min-w-0 text-left disabled:cursor-not-allowed disabled:opacity-60"
                disabled={isSelectionDisabled}
                onClick={() => onSelect(item)}
              >
                <span className="flex min-w-0 items-start justify-between gap-3">
                  <span className="min-w-0">
                    <span className="block break-words text-sm font-medium">{targetLabel}</span>
                    <span className="text-muted-foreground block break-words text-xs">
                      {approvalActionLabel(item.action)}
                    </span>
                  </span>
                  <span className="shrink-0">
                    <ApprovalDecisionBadge decision={item.decision} />
                  </span>
                </span>
                <span className="text-muted-foreground mt-3 grid gap-1 text-xs">
                  <span className="break-words">Người yêu cầu: {item.requesterUserId}</span>
                  <span className="break-words">Lý do: {reasonLabel}</span>
                  <span className="tabular-nums">{new Date(item.createdAt).toLocaleString()}</span>
                  {isSelected && <span className="text-primary font-medium">Đang chọn</span>}
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
