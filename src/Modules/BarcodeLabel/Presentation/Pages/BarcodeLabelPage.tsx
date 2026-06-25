import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Loader2, Plus, Tags } from 'lucide-react';

import { ROUTES } from '@app/Config/Routes';
import { ApiError } from '@shared/Services/Http/ApiError';
import { Input } from '@shared/Components/Ui/Input';
import { Button } from '@shared/Components/Ui/Button';
import { ListPageShell } from '@shared/Components/Page/ListPageShell';
import { vietnameseOperationalLabel } from '@shared/Presentation/VietnameseOperationalLabels';
import { cn } from '@shared/Utils/Cn';
import {
  useLabelTemplates,
  usePrintJobs,
} from '@modules/BarcodeLabel/Application/Queries/UseBarcodeLabels';
import {
  LABEL_TEMPLATE_STATUSES,
  PRINT_JOB_STATUSES,
} from '@modules/BarcodeLabel/Domain/Constants/BarcodeLabelConstants';
import type {
  LabelTemplate,
  LabelTemplateStatus,
  PrintJob,
  PrintJobStatus,
} from '@modules/BarcodeLabel/Domain/Types/BarcodeLabel';

type TemplateStatusFilter = 'All' | LabelTemplateStatus;
type PrintJobStatusFilter = 'All' | PrintJobStatus;

function StatusBadge({ status }: { status: LabelTemplateStatus | PrintJobStatus }) {
  return <span className="rounded-md border px-2 py-1 text-xs font-medium">{vietnameseOperationalLabel(status)}</span>;
}

function TemplateCard({ template }: { template: LabelTemplate }) {
  return (
    <Link
      to={ROUTES.LABELS.TEMPLATE_DETAIL(template.id)}
      aria-label={`${template.templateCode} ${template.templateName}`}
      className={cn('block w-full rounded-md border p-4 text-left transition-colors hover:bg-muted/60')}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="font-semibold">{template.templateCode}</div>
          <div className="text-muted-foreground text-sm">{template.templateName}</div>
        </div>
        <StatusBadge status={template.status} />
      </div>
      <div className="text-muted-foreground mt-3 text-xs">
        {template.labelType} - {template.requiredFields.join(', ')}
      </div>
    </Link>
  );
}

function PrintJobRow({ job }: { job: PrintJob }) {
  return (
    <Link
      to={ROUTES.LABELS.PRINT_JOB_DETAIL(job.id)}
      aria-label={`${job.jobCode} ${job.status}`}
      className={cn(
        'grid w-full gap-2 rounded-md border p-3 text-left text-sm transition-colors hover:bg-muted/60 sm:grid-cols-[1fr_auto]',
      )}
    >
      <div>
        <div className="font-medium">{job.jobCode}</div>
        <div className="text-muted-foreground text-xs">
          {job.businessObjectType} - {job.businessObjectCode ?? job.businessObjectId}
        </div>
      </div>
      <div className="flex items-center gap-2 sm:justify-end">
        <StatusBadge status={job.status} />
        <span className="text-muted-foreground text-xs">R{job.reprintCount}</span>
      </div>
    </Link>
  );
}

export function BarcodeLabelPage() {
  const [templateStatus, setTemplateStatus] = useState<TemplateStatusFilter>('All');
  const [printJobStatus, setPrintJobStatus] = useState<PrintJobStatusFilter>('All');
  const [templateCode, setTemplateCode] = useState('');
  const [businessObjectId, setBusinessObjectId] = useState('');

  const templatesQuery = useLabelTemplates({
    templateCode: templateCode.trim() || undefined,
    status: templateStatus === 'All' ? undefined : templateStatus,
  });
  const printJobsQuery = usePrintJobs({
    businessObjectId: businessObjectId.trim() || undefined,
    status: printJobStatus === 'All' ? undefined : printJobStatus,
  });

  const templates = useMemo(() => templatesQuery.data?.items ?? [], [templatesQuery.data?.items]);
  const printJobs = useMemo(() => printJobsQuery.data?.items ?? [], [printJobsQuery.data?.items]);
  const templateError = templatesQuery.error instanceof ApiError ? templatesQuery.error : null;
  const printJobError = printJobsQuery.error instanceof ApiError ? printJobsQuery.error : null;
  const denied = Boolean(templateError?.isForbidden || printJobError?.isForbidden);
  const state = denied
    ? 'forbidden'
    : templatesQuery.isLoading || printJobsQuery.isLoading
      ? 'loading'
      : templatesQuery.error || printJobsQuery.error
        ? 'error'
        : templates.length === 0 && printJobs.length === 0
          ? 'empty'
          : null;

  return (
    <ListPageShell
      title="Nhãn và lệnh in"
      description="Quét mẫu nhãn và lệnh in trước khi mở trang chi tiết/thao tác riêng."
      state={state}
      stateTitle={
        denied
          ? 'Từ chối quyền truy cập'
          : templatesQuery.error || printJobsQuery.error
            ? 'Không thể tải nhãn'
            : undefined
      }
      stateMessage={
        denied
          ? 'Bạn không có quyền xem nhãn hoặc lệnh in.'
          : templatesQuery.error || printJobsQuery.error
            ? 'Không thể tải không gian làm việc nhãn.'
            : 'Không có mẫu nhãn hoặc lệnh in nào khớp bộ lọc hiện tại.'
      }
      toolbar={
        <Button asChild size="sm">
          <Link to={ROUTES.LABELS.NEW}>
            <Plus className="size-4" aria-hidden="true" />
            Tạo mẫu mới
          </Link>
        </Button>
      }
      filters={
        <div className="grid gap-3 md:grid-cols-4">
          <label className="grid gap-1 text-sm">
            Mã mẫu
            <Input
              value={templateCode}
              onChange={(event) => setTemplateCode(event.target.value)}
              placeholder="LPN-STD"
            />
          </label>
          <label className="grid gap-1 text-sm">
            Trạng thái mẫu
            <select
              className="h-9 rounded-md border bg-transparent px-3 text-sm"
              value={templateStatus}
              onChange={(event) => setTemplateStatus(event.target.value as TemplateStatusFilter)}
            >
              <option value="All">Tất cả</option>
              {LABEL_TEMPLATE_STATUSES.map((status) => (
                <option key={status} value={status}>
                  {vietnameseOperationalLabel(status)}
                </option>
              ))}
            </select>
          </label>
          <label className="grid gap-1 text-sm">
            ID đối tượng nghiệp vụ
            <Input
              value={businessObjectId}
              onChange={(event) => setBusinessObjectId(event.target.value)}
              placeholder="lpn-1"
            />
          </label>
          <label className="grid gap-1 text-sm">
            Trạng thái lệnh in
            <select
              className="h-9 rounded-md border bg-transparent px-3 text-sm"
              value={printJobStatus}
              onChange={(event) => setPrintJobStatus(event.target.value as PrintJobStatusFilter)}
            >
              <option value="All">Tất cả</option>
              {PRINT_JOB_STATUSES.map((status) => (
                <option key={status} value={status}>
                  {vietnameseOperationalLabel(status)}
                </option>
              ))}
            </select>
          </label>
        </div>
      }
    >
      {templatesQuery.isLoading || printJobsQuery.isLoading ? (
        <div className="text-muted-foreground flex items-center gap-2 text-sm">
          <Loader2 className="size-4 animate-spin" />
          Đang tải nhãn và lệnh in
        </div>
      ) : (
        <div className="grid gap-4 xl:grid-cols-2">
          <section className="space-y-3">
            <div className="flex items-center gap-2 text-sm font-semibold">
              <Tags className="size-4" />
              Mẫu nhãn
            </div>
            <div className="grid gap-3 md:grid-cols-2">
              {templates.map((template) => (
                <TemplateCard key={template.id} template={template} />
              ))}
            </div>
          </section>
          <section className="space-y-3">
            <div className="flex items-center gap-2 text-sm font-semibold">
              <Tags className="size-4" />
              Lệnh in
            </div>
            <div className="grid gap-3">
              {printJobs.map((job) => (
                <PrintJobRow key={job.id} job={job} />
              ))}
            </div>
          </section>
        </div>
      )}
    </ListPageShell>
  );
}
