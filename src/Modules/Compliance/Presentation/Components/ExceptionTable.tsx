import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@shared/Components/Ui/Table';
import type { ExceptionCase } from '@modules/Compliance/Domain/Entities/Compliance';
import { ExceptionStateBadge } from '@modules/Compliance/Presentation/Components/ExceptionStateBadge';
import {
  businessReferenceLabel,
  exceptionSeverityLabel,
  firstNonBlankText,
} from '@modules/Compliance/Presentation/Constants/ComplianceDisplayText';

interface ExceptionTableProps {
  cases: ExceptionCase[];
  selectedId: string | null;
  onSelect: (item: ExceptionCase) => void;
  isSelectionDisabled?: boolean;
}

export function ExceptionTable({
  cases,
  selectedId,
  onSelect,
  isSelectionDisabled = false,
}: ExceptionTableProps) {
  return (
    <div className="min-w-0 space-y-3">
      <div className="hidden md:block">
        <Table aria-label="Danh sách ngoại lệ dạng bảng" className="min-w-[820px] table-fixed">
          <TableHeader>
            <TableRow>
              <TableHead className="w-[17%]">Trạng thái</TableHead>
              <TableHead className="w-[20%]">Loại</TableHead>
              <TableHead className="w-[18%]">Người được gán</TableHead>
              <TableHead className="w-[17%]">Lý do</TableHead>
              <TableHead className="w-[18%]">Tham chiếu đối tượng</TableHead>
              <TableHead className="w-[10%]">Mức độ</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {cases.map((item) => {
              const isSelected = item.id === selectedId;
              const assignee =
                firstNonBlankText(item.assignedToUserId, item.assignedRoleId) ?? 'Chưa gán';
              const referenceLabel =
                businessReferenceLabel(item.referenceType, item.referenceId) ??
                firstNonBlankText(item.referenceId) ??
                '—';
              const reasonLabel = firstNonBlankText(item.reasonCodeId) ?? '—';

              return (
                <TableRow
                  key={item.id}
                  data-selected={isSelected}
                  data-state={isSelected ? 'selected' : undefined}
                >
                  <TableCell className="whitespace-normal">
                    <ExceptionStateBadge state={item.state} />
                  </TableCell>
                  <TableCell className="whitespace-normal break-words">
                    <button
                      type="button"
                      aria-label={`Mở chi tiết ngoại lệ ${item.exceptionType} cho tham chiếu ${referenceLabel}, bản ghi ${item.id}`}
                      aria-current={isSelected ? 'true' : undefined}
                      className="break-words text-left underline-offset-2 hover:underline disabled:cursor-not-allowed disabled:opacity-60"
                      disabled={isSelectionDisabled}
                      onClick={() => onSelect(item)}
                    >
                      {item.exceptionType}
                    </button>
                    {isSelected && (
                      <span className="text-primary mt-1 block text-xs font-medium">Đang chọn</span>
                    )}
                  </TableCell>
                  <TableCell className="whitespace-normal break-words">{assignee}</TableCell>
                  <TableCell className="whitespace-normal break-words">{reasonLabel}</TableCell>
                  <TableCell className="whitespace-normal break-words">{referenceLabel}</TableCell>
                  <TableCell className="whitespace-normal break-words">
                    {exceptionSeverityLabel(item.severity)}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      <ul aria-label="Danh sách ngoại lệ dạng thẻ" className="grid gap-2 md:hidden">
        {cases.map((item) => {
          const isSelected = item.id === selectedId;
          const assignee =
            firstNonBlankText(item.assignedToUserId, item.assignedRoleId) ?? 'Chưa gán';
          const referenceLabel =
            businessReferenceLabel(item.referenceType, item.referenceId) ??
            firstNonBlankText(item.referenceId) ??
            '—';
          const reasonLabel = firstNonBlankText(item.reasonCodeId) ?? '—';

          return (
            <li
              key={item.id}
              data-selected={isSelected}
              className="min-w-0 rounded-md border p-3 data-[selected=true]:border-primary data-[selected=true]:bg-primary/5"
            >
              <button
                type="button"
                aria-label={`Mở chi tiết ngoại lệ ${item.exceptionType} cho tham chiếu ${referenceLabel}, bản ghi ${item.id}`}
                aria-current={isSelected ? 'true' : undefined}
                className="block w-full min-w-0 text-left disabled:cursor-not-allowed disabled:opacity-60"
                disabled={isSelectionDisabled}
                onClick={() => onSelect(item)}
              >
                <span className="flex min-w-0 items-start justify-between gap-3">
                  <span className="min-w-0">
                    <span className="block break-words text-sm font-medium">
                      {item.exceptionType}
                    </span>
                    <span className="text-muted-foreground block break-words text-xs">
                      {referenceLabel}
                    </span>
                  </span>
                  <span className="shrink-0">
                    <ExceptionStateBadge state={item.state} />
                  </span>
                </span>
                <span className="text-muted-foreground mt-3 grid gap-1 text-xs">
                  <span className="break-words">Người được gán: {assignee}</span>
                  <span className="break-words">Lý do: {reasonLabel}</span>
                  <span>Mức độ: {exceptionSeverityLabel(item.severity)}</span>
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
