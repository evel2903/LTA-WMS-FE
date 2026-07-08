import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@shared/Components/Ui/Table';
import type { OverrideLog } from '@modules/OverrideLog/Domain/Entities/OverrideLog';
import { OverrideControlModeBadge } from '@modules/OverrideLog/Presentation/Components/OverrideControlModeBadge';
import {
  firstNonBlankText,
  overrideReasonLabel,
  overrideTargetLabelFromParts,
} from '@modules/OverrideLog/Presentation/Constants/OverrideLogDisplayText';

interface OverrideLogTableProps {
  logs: OverrideLog[];
  selectedId: string | null;
  onSelect: (log: OverrideLog) => void;
  isSelectionDisabled?: boolean;
}

/** Read-only override log table — no mutate controls (immutable, AC2/AC5). */
export function OverrideLogTable({
  logs,
  selectedId,
  onSelect,
  isSelectionDisabled = false,
}: OverrideLogTableProps) {
  return (
    <div className="min-w-0 space-y-3">
      <div className="hidden md:block">
        <Table
          aria-label="Danh sách nhật ký ghi đè dạng bảng"
          className="min-w-[900px] table-fixed"
        >
          <TableHeader>
            <TableRow>
              <TableHead className="w-[15%]">Quy tắc</TableHead>
              <TableHead className="w-[14%]">Người thực hiện</TableHead>
              <TableHead className="w-[20%]">Đối tượng đích</TableHead>
              <TableHead className="w-[16%]">Lý do</TableHead>
              <TableHead className="w-[14%]">Tham chiếu phê duyệt</TableHead>
              <TableHead className="w-[12%]">Chế độ</TableHead>
              <TableHead className="w-[9%]">Thời gian</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {logs.map((log) => {
              const isSelected = log.id === selectedId;
              const targetLabel = overrideTargetLabelFromParts(
                log.targetObjectType,
                log.targetObjectCode,
                log.targetObjectId,
              );
              const reasonLabel = overrideReasonLabel(log.reasonNote, log.reasonCodeId);
              const approvalLabel = firstNonBlankText(log.approvalRequestId) ?? '—';

              return (
                <TableRow
                  key={log.id}
                  data-selected={isSelected}
                  data-state={isSelected ? 'selected' : undefined}
                >
                  <TableCell className="whitespace-normal break-words">
                    <button
                      type="button"
                      aria-label={`Mở chi tiết nhật ký ghi đè quy tắc ${log.ruleCode}, đối tượng ${targetLabel}, người thực hiện ${log.actorUserId}, bản ghi ${log.id}`}
                      aria-current={isSelected ? 'true' : undefined}
                      className="break-words text-left underline-offset-2 hover:underline disabled:cursor-not-allowed disabled:opacity-60"
                      disabled={isSelectionDisabled}
                      onClick={() => onSelect(log)}
                    >
                      {log.ruleCode}
                    </button>
                    {isSelected && (
                      <span className="text-primary mt-1 block text-xs font-medium">Đang chọn</span>
                    )}
                  </TableCell>
                  <TableCell className="text-muted-foreground whitespace-normal break-words">
                    {log.actorUserId}
                  </TableCell>
                  <TableCell className="whitespace-normal break-words">{targetLabel}</TableCell>
                  <TableCell className="text-muted-foreground whitespace-normal break-words">
                    {reasonLabel}
                  </TableCell>
                  <TableCell className="text-muted-foreground whitespace-normal break-words">
                    {approvalLabel}
                  </TableCell>
                  <TableCell className="whitespace-normal">
                    <OverrideControlModeBadge mode={log.controlMode} />
                  </TableCell>
                  <TableCell className="text-muted-foreground text-xs whitespace-normal">
                    {new Date(log.createdAt).toLocaleString()}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      <ul aria-label="Danh sách nhật ký ghi đè dạng thẻ" className="grid gap-2 md:hidden">
        {logs.map((log) => {
          const isSelected = log.id === selectedId;
          const targetLabel = overrideTargetLabelFromParts(
            log.targetObjectType,
            log.targetObjectCode,
            log.targetObjectId,
          );
          const reasonLabel = overrideReasonLabel(log.reasonNote, log.reasonCodeId);
          const approvalLabel = firstNonBlankText(log.approvalRequestId) ?? '—';

          return (
            <li
              key={log.id}
              data-selected={isSelected}
              className="min-w-0 rounded-md border p-3 data-[selected=true]:border-primary data-[selected=true]:bg-primary/5"
            >
              <button
                type="button"
                aria-label={`Mở chi tiết nhật ký ghi đè quy tắc ${log.ruleCode}, đối tượng ${targetLabel}, người thực hiện ${log.actorUserId}, bản ghi ${log.id}`}
                aria-current={isSelected ? 'true' : undefined}
                disabled={isSelectionDisabled}
                className="block w-full min-w-0 text-left disabled:cursor-not-allowed disabled:opacity-60"
                onClick={() => onSelect(log)}
              >
                <span className="flex min-w-0 items-start justify-between gap-3">
                  <span className="min-w-0">
                    <span className="block break-words text-sm font-medium">{log.ruleCode}</span>
                    <span className="text-muted-foreground block break-words text-xs">
                      {targetLabel}
                    </span>
                  </span>
                  <span className="shrink-0">
                    <OverrideControlModeBadge mode={log.controlMode} />
                  </span>
                </span>
                <span className="text-muted-foreground mt-3 grid gap-1 text-xs">
                  <span className="break-words">Người thực hiện: {log.actorUserId}</span>
                  <span className="break-words">Lý do: {reasonLabel}</span>
                  <span className="break-words">Phê duyệt: {approvalLabel}</span>
                  <span className="tabular-nums">{new Date(log.createdAt).toLocaleString()}</span>
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
