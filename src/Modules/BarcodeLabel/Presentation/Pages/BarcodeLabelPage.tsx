import { useEffect, useMemo, useState } from 'react';
import { Loader2, RefreshCw, ShieldAlert, Tags } from 'lucide-react';
import { ApiError } from '@shared/Services/Http/ApiError';
import { Card, CardContent, CardHeader, CardTitle } from '@shared/Components/Ui/Card';
import { Input } from '@shared/Components/Ui/Input';
import { cn } from '@shared/Utils/Cn';
import { useBarcodeLabelMutations } from '@modules/BarcodeLabel/Application/Commands/UseBarcodeLabelMutations';
import {
  useLabelTemplates,
  usePrintJobs,
} from '@modules/BarcodeLabel/Application/Queries/UseBarcodeLabels';
import {
  LABEL_BLOCKING_ACTIONS,
  LABEL_TEMPLATE_STATUSES,
  LABEL_TYPES,
  PRINT_JOB_STATUSES,
} from '@modules/BarcodeLabel/Domain/Constants/BarcodeLabelConstants';
import type {
  LabelBlockingDownstreamAction,
  LabelTemplate,
  LabelTemplateStatus,
  PrintJob,
  PrintJobStatus,
} from '@modules/BarcodeLabel/Domain/Types/BarcodeLabel';

type TemplateStatusFilter = 'All' | LabelTemplateStatus;
type PrintJobStatusFilter = 'All' | PrintJobStatus;

function parseRequiredFields(value: string): string[] {
  return [
    ...new Set(
      value
        .split(/[,\n]/)
        .map((item) => item.trim())
        .filter(Boolean),
    ),
  ];
}

function StatusBadge({ status }: { status: LabelTemplateStatus | PrintJobStatus }) {
  return <span className="rounded-md border px-2 py-1 text-xs font-medium">{status}</span>;
}

function TemplateCard({
  template,
  active,
  onSelect,
}: {
  template: LabelTemplate;
  active: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      aria-pressed={active}
      aria-label={`${template.templateCode} ${template.templateName}`}
      onClick={onSelect}
      className={cn(
        'w-full rounded-md border p-4 text-left transition-colors',
        active ? 'border-primary bg-primary/5' : 'hover:bg-muted/60',
      )}
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
    </button>
  );
}

function PrintJobRow({
  job,
  active,
  onSelect,
}: {
  job: PrintJob;
  active: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      aria-pressed={active}
      aria-label={`${job.jobCode} ${job.status}`}
      onClick={onSelect}
      className={cn(
        'grid w-full gap-2 rounded-md border p-3 text-left text-sm transition-colors sm:grid-cols-[1fr_auto]',
        active ? 'border-primary bg-primary/5' : 'hover:bg-muted/60',
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
    </button>
  );
}

export function BarcodeLabelPage() {
  const [templateStatus, setTemplateStatus] = useState<TemplateStatusFilter>('All');
  const [printJobStatus, setPrintJobStatus] = useState<PrintJobStatusFilter>('All');
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null);
  const [selectedPrintJob, setSelectedPrintJob] = useState<PrintJob | null>(null);
  const [templateCode, setTemplateCode] = useState('LPN-STD');
  const [templateName, setTemplateName] = useState('LPN Standard');
  const [labelType, setLabelType] = useState<(typeof LABEL_TYPES)[number]>('LPN');
  const [requiredFields, setRequiredFields] = useState('BarcodeValue, OwnerCode');
  const [templateBody, setTemplateBody] = useState('LPN {{BarcodeValue}}\nOwner {{OwnerCode}}');
  const [businessObjectType, setBusinessObjectType] = useState('LPN');
  const [businessObjectId, setBusinessObjectId] = useState('lpn-1');
  const [businessObjectCode, setBusinessObjectCode] = useState('LPN0001');
  const [warehouseId, setWarehouseId] = useState('warehouse-a');
  const [ownerId, setOwnerId] = useState('owner-a');
  const [payloadText, setPayloadText] = useState(
    '{\n  "BarcodeValue": "SSCC-1",\n  "OwnerCode": "OWN"\n}',
  );
  const [payloadError, setPayloadError] = useState<string | null>(null);
  const [reasonCode, setReasonCode] = useState('RC-V1-REPRINT');
  const [reasonNote, setReasonNote] = useState('Label damaged');
  const [blockingAction, setBlockingAction] = useState<LabelBlockingDownstreamAction>('putaway');
  const [blockingProfileId, setBlockingProfileId] = useState('profile-1');
  const [blockingLabelType, setBlockingLabelType] = useState('LPN');
  const [attemptOverride, setAttemptOverride] = useState(false);
  const [overrideReasonCode, setOverrideReasonCode] = useState('RC-V1-OVERRIDE');
  const [overrideReasonNote, setOverrideReasonNote] = useState('Supervisor accepted');

  const templatesQuery = useLabelTemplates({
    status: templateStatus === 'All' ? undefined : templateStatus,
  });
  const templates = useMemo(() => templatesQuery.data?.items ?? [], [templatesQuery.data?.items]);
  const selectedTemplate = useMemo(
    () => templates.find((template) => template.id === selectedTemplateId) ?? templates[0] ?? null,
    [selectedTemplateId, templates],
  );
  const printJobsQuery = usePrintJobs({
    templateId: selectedTemplate?.id,
    status: printJobStatus === 'All' ? undefined : printJobStatus,
  });
  const printJobs = useMemo(() => printJobsQuery.data?.items ?? [], [printJobsQuery.data?.items]);
  const mutations = useBarcodeLabelMutations();
  const resetPreviewPrintJob = mutations.previewPrintJob.reset;
  const resetReprintPrintJob = mutations.reprintPrintJob.reset;
  const resetValidateLabelBlocking = mutations.validateLabelBlocking.reset;
  const templateError = templatesQuery.error instanceof ApiError ? templatesQuery.error : null;
  const printJobError = printJobsQuery.error instanceof ApiError ? printJobsQuery.error : null;
  const mutationError = [
    mutations.createTemplate.error,
    mutations.createTemplateVersion.error,
    mutations.previewPrintJob.error,
    mutations.reprintPrintJob.error,
    mutations.validateLabelBlocking.error,
  ].find((error): error is ApiError => error instanceof ApiError);
  const denied = Boolean(templateError?.isForbidden || printJobError?.isForbidden);
  const mutationDenied = Boolean(mutationError?.isForbidden);
  const canCreateTemplate =
    templateCode.trim().length > 0 &&
    templateName.trim().length > 0 &&
    parseRequiredFields(requiredFields).length > 0 &&
    templateBody.trim().length > 0;
  const previewSource = selectedPrintJob ?? mutations.previewPrintJob.data ?? null;
  const canPreview = Boolean(
    selectedTemplate && businessObjectType.trim() && businessObjectId.trim(),
  );
  const canReprint = Boolean(previewSource && reasonCode.trim().length > 0);
  const canValidateLabelBlock = Boolean(
    businessObjectType.trim() &&
    businessObjectId.trim() &&
    blockingProfileId.trim() &&
    (!attemptOverride || overrideReasonCode.trim().length > 0),
  );
  const labelBlockingResult = mutations.validateLabelBlocking.data ?? null;

  useEffect(() => {
    if (!selectedTemplateId && templates[0]) {
      setSelectedTemplateId(templates[0].id);
    }
    if (selectedTemplateId && !templates.some((template) => template.id === selectedTemplateId)) {
      setSelectedTemplateId(templates[0]?.id ?? null);
    }
  }, [selectedTemplateId, templates]);

  useEffect(() => {
    setSelectedPrintJob(null);
    resetPreviewPrintJob();
    resetReprintPrintJob();
  }, [selectedTemplate?.id, printJobStatus, resetPreviewPrintJob, resetReprintPrintJob]);

  useEffect(() => {
    resetValidateLabelBlocking();
  }, [
    attemptOverride,
    blockingAction,
    blockingLabelType,
    blockingProfileId,
    businessObjectCode,
    businessObjectId,
    businessObjectType,
    overrideReasonCode,
    overrideReasonNote,
    ownerId,
    resetValidateLabelBlocking,
    warehouseId,
  ]);

  if (denied) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Labels & print jobs</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-sm">
            Permission denied for label or print job read.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_420px]">
      <section className="space-y-4">
        <div className="grid gap-3 rounded-md border p-4 sm:grid-cols-2">
          <label className="grid gap-1 text-sm">
            Template status
            <select
              className="h-9 rounded-md border bg-transparent px-3 text-sm"
              value={templateStatus}
              onChange={(event) => setTemplateStatus(event.target.value as TemplateStatusFilter)}
            >
              <option value="All">All</option>
              {LABEL_TEMPLATE_STATUSES.map((status) => (
                <option key={status} value={status}>
                  {status}
                </option>
              ))}
            </select>
          </label>
          <label className="grid gap-1 text-sm">
            Print job status
            <select
              className="h-9 rounded-md border bg-transparent px-3 text-sm"
              value={printJobStatus}
              onChange={(event) => setPrintJobStatus(event.target.value as PrintJobStatusFilter)}
            >
              <option value="All">All</option>
              {PRINT_JOB_STATUSES.map((status) => (
                <option key={status} value={status}>
                  {status}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className="grid gap-3 md:grid-cols-2">
          {templatesQuery.isLoading ? (
            <div className="text-muted-foreground flex items-center gap-2 text-sm">
              <Loader2 className="size-4 animate-spin" />
              Loading label templates
            </div>
          ) : templatesQuery.error ? (
            <div className="text-destructive text-sm">Unable to load label templates.</div>
          ) : templates.length === 0 ? (
            <div className="text-muted-foreground text-sm">
              No label templates match the current filter.
            </div>
          ) : (
            templates.map((template) => (
              <TemplateCard
                key={template.id}
                template={template}
                active={template.id === selectedTemplate?.id}
                onSelect={() => {
                  setSelectedTemplateId(template.id);
                  setRequiredFields(template.requiredFields.join(', '));
                  setTemplateBody(template.templateBody);
                  setSelectedPrintJob(null);
                  mutations.previewPrintJob.reset();
                  mutations.reprintPrintJob.reset();
                }}
              />
            ))
          )}
        </div>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Tags className="size-4" />
              <CardTitle className="text-base">Print jobs</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {printJobsQuery.isLoading ? (
              <div className="text-muted-foreground flex items-center gap-2 text-sm">
                <Loader2 className="size-4 animate-spin" />
                Loading print jobs
              </div>
            ) : printJobsQuery.error ? (
              <div className="text-destructive text-sm">Unable to load print jobs.</div>
            ) : printJobs.length === 0 ? (
              <div className="text-muted-foreground text-sm">
                No print jobs for the current selection.
              </div>
            ) : (
              printJobs.map((job) => (
                <PrintJobRow
                  key={job.id}
                  job={job}
                  active={job.id === previewSource?.id}
                  onSelect={() => setSelectedPrintJob(job)}
                />
              ))
            )}
          </CardContent>
        </Card>
      </section>

      <section className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Template setup</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {mutationDenied && (
              <p className="text-destructive text-sm">
                Permission denied for the requested label action.
              </p>
            )}
            <label className="grid gap-1 text-sm">
              Template code
              <Input
                value={templateCode}
                onChange={(event) => setTemplateCode(event.target.value)}
              />
            </label>
            <label className="grid gap-1 text-sm">
              Template name
              <Input
                value={templateName}
                onChange={(event) => setTemplateName(event.target.value)}
              />
            </label>
            <label className="grid gap-1 text-sm">
              Label type
              <select
                className="h-9 rounded-md border bg-transparent px-3 text-sm"
                value={labelType}
                onChange={(event) =>
                  setLabelType(event.target.value as (typeof LABEL_TYPES)[number])
                }
              >
                {LABEL_TYPES.map((type) => (
                  <option key={type} value={type}>
                    {type}
                  </option>
                ))}
              </select>
            </label>
            <label className="grid gap-1 text-sm">
              Required fields
              <Input
                value={requiredFields}
                onChange={(event) => setRequiredFields(event.target.value)}
              />
            </label>
            <label className="grid gap-1 text-sm">
              Template body
              <textarea
                className="min-h-24 rounded-md border bg-transparent px-3 py-2 text-sm"
                value={templateBody}
                onChange={(event) => setTemplateBody(event.target.value)}
              />
            </label>
            <button
              type="button"
              className="w-full rounded-md border px-3 py-2 text-sm font-medium hover:bg-muted disabled:cursor-not-allowed disabled:opacity-50"
              disabled={!canCreateTemplate || mutationDenied || mutations.createTemplate.isPending}
              onClick={() =>
                mutations.createTemplate.mutate(
                  {
                    templateCode: templateCode.trim(),
                    templateName: templateName.trim(),
                    labelType,
                    requiredFields: parseRequiredFields(requiredFields),
                    templateBody,
                    status: 'Active',
                  },
                  {
                    onSuccess: (template) => {
                      setSelectedTemplateId(template.id);
                      mutations.previewPrintJob.reset();
                    },
                  },
                )
              }
            >
              Create template
            </button>
            <button
              type="button"
              className="w-full rounded-md border px-3 py-2 text-sm font-medium hover:bg-muted disabled:cursor-not-allowed disabled:opacity-50"
              disabled={
                !selectedTemplate ||
                !canCreateTemplate ||
                mutationDenied ||
                mutations.createTemplateVersion.isPending
              }
              onClick={() => {
                if (!selectedTemplate) return;
                mutations.createTemplateVersion.mutate(
                  {
                    id: selectedTemplate.id,
                    input: {
                      requiredFields: parseRequiredFields(requiredFields),
                      templateBody,
                    },
                  },
                  {
                    onSuccess: (template) => {
                      setSelectedTemplateId(template.id);
                      setSelectedPrintJob(null);
                      mutations.previewPrintJob.reset();
                    },
                  },
                );
              }}
            >
              Create new version
            </button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Payload preview</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="rounded-md border p-3 text-sm">
              <div className="font-medium">
                {selectedTemplate?.templateCode ?? 'No template selected'}
              </div>
              <div className="text-muted-foreground mt-1">
                {selectedTemplate?.requiredFields.join(', ') ?? 'No required fields'}
              </div>
            </div>
            <label className="grid gap-1 text-sm">
              Business object type
              <Input
                value={businessObjectType}
                onChange={(event) => setBusinessObjectType(event.target.value)}
              />
            </label>
            <label className="grid gap-1 text-sm">
              Business object id
              <Input
                value={businessObjectId}
                onChange={(event) => setBusinessObjectId(event.target.value)}
              />
            </label>
            <label className="grid gap-1 text-sm">
              Business object code
              <Input
                value={businessObjectCode}
                onChange={(event) => setBusinessObjectCode(event.target.value)}
              />
            </label>
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="grid gap-1 text-sm">
                Warehouse id
                <Input
                  value={warehouseId}
                  onChange={(event) => setWarehouseId(event.target.value)}
                />
              </label>
              <label className="grid gap-1 text-sm">
                Owner id
                <Input value={ownerId} onChange={(event) => setOwnerId(event.target.value)} />
              </label>
            </div>
            <label className="grid gap-1 text-sm">
              Payload JSON
              <textarea
                className="min-h-32 rounded-md border bg-transparent px-3 py-2 font-mono text-sm"
                value={payloadText}
                onChange={(event) => {
                  setPayloadText(event.target.value);
                  setPayloadError(null);
                }}
              />
            </label>
            {payloadError && <p className="text-destructive text-sm">{payloadError}</p>}
            <button
              type="button"
              className="w-full rounded-md border px-3 py-2 text-sm font-medium hover:bg-muted disabled:cursor-not-allowed disabled:opacity-50"
              disabled={!canPreview || mutations.previewPrintJob.isPending}
              onClick={() => {
                setPayloadError(null);
                let payload: Record<string, unknown>;
                try {
                  payload = JSON.parse(payloadText) as Record<string, unknown>;
                } catch {
                  setPayloadError('Payload JSON is invalid.');
                  return;
                }
                if (!selectedTemplate) return;
                setSelectedPrintJob(null);
                mutations.previewPrintJob.reset();
                mutations.previewPrintJob.mutate({
                  templateId: selectedTemplate.id,
                  businessObjectType: businessObjectType.trim(),
                  businessObjectId: businessObjectId.trim(),
                  businessObjectCode: businessObjectCode.trim() || null,
                  warehouseId: warehouseId.trim() || null,
                  ownerId: ownerId.trim() || null,
                  payloadJson: payload,
                });
              }}
            >
              Preview print job
            </button>
            {mutations.previewPrintJob.isPending && (
              <p className="text-muted-foreground flex items-center gap-2 text-sm">
                <RefreshCw className="size-4 animate-spin" />
                Creating preview
              </p>
            )}
            {previewSource && (
              <div className="space-y-3 rounded-md border p-3 text-sm">
                <div className="flex items-center justify-between gap-2">
                  <div className="font-medium">{previewSource.jobCode}</div>
                  <StatusBadge status={previewSource.status} />
                </div>
                <pre className="bg-muted/50 overflow-auto rounded-md p-3 text-xs whitespace-pre-wrap">
                  {previewSource.previewContent ?? 'No preview content'}
                </pre>
                <div className="grid gap-2">
                  <label className="grid gap-1 text-sm">
                    Reprint reason code
                    <Input
                      value={reasonCode}
                      onChange={(event) => setReasonCode(event.target.value)}
                    />
                  </label>
                  <label className="grid gap-1 text-sm">
                    Reprint reason note
                    <Input
                      value={reasonNote}
                      onChange={(event) => setReasonNote(event.target.value)}
                    />
                  </label>
                  <button
                    type="button"
                    className="rounded-md border px-3 py-2 text-sm font-medium hover:bg-muted disabled:cursor-not-allowed disabled:opacity-50"
                    disabled={!canReprint || mutations.reprintPrintJob.isPending}
                    onClick={() =>
                      mutations.reprintPrintJob.mutate(
                        {
                          id: previewSource.id,
                          input: {
                            reasonCode: reasonCode.trim(),
                            reasonNote: reasonNote.trim() || null,
                          },
                        },
                        { onSuccess: (job) => setSelectedPrintJob(job) },
                      )
                    }
                  >
                    Reprint job
                  </button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <ShieldAlert className="size-4" />
              <CardTitle className="text-base">Label blocking</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="grid gap-1 text-sm">
                Downstream action
                <select
                  className="h-9 rounded-md border bg-transparent px-3 text-sm"
                  value={blockingAction}
                  onChange={(event) =>
                    setBlockingAction(event.target.value as LabelBlockingDownstreamAction)
                  }
                >
                  {LABEL_BLOCKING_ACTIONS.map((action) => (
                    <option key={action} value={action}>
                      {action}
                    </option>
                  ))}
                </select>
              </label>
              <label className="grid gap-1 text-sm">
                Warehouse profile id
                <Input
                  value={blockingProfileId}
                  onChange={(event) => setBlockingProfileId(event.target.value)}
                />
              </label>
            </div>
            <label className="grid gap-1 text-sm">
              Required label type
              <Input
                value={blockingLabelType}
                onChange={(event) => setBlockingLabelType(event.target.value)}
              />
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={attemptOverride}
                onChange={(event) => setAttemptOverride(event.target.checked)}
              />
              Attempt override
            </label>
            {attemptOverride && (
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="grid gap-1 text-sm">
                  Override reason code
                  <Input
                    value={overrideReasonCode}
                    onChange={(event) => setOverrideReasonCode(event.target.value)}
                  />
                </label>
                <label className="grid gap-1 text-sm">
                  Override reason note
                  <Input
                    value={overrideReasonNote}
                    onChange={(event) => setOverrideReasonNote(event.target.value)}
                  />
                </label>
              </div>
            )}
            <button
              type="button"
              className="w-full rounded-md border px-3 py-2 text-sm font-medium hover:bg-muted disabled:cursor-not-allowed disabled:opacity-50"
              disabled={
                !canValidateLabelBlock ||
                mutationDenied ||
                mutations.validateLabelBlocking.isPending
              }
              onClick={() => {
                resetValidateLabelBlocking();
                mutations.validateLabelBlocking.mutate({
                  downstreamAction: blockingAction,
                  businessObjectType: businessObjectType.trim(),
                  businessObjectId: businessObjectId.trim(),
                  businessObjectCode: businessObjectCode.trim() || null,
                  warehouseProfileId: blockingProfileId.trim(),
                  warehouseId: warehouseId.trim() || null,
                  ownerId: ownerId.trim() || null,
                  labelType: blockingLabelType.trim() || null,
                  attemptOverride,
                  reasonCode: attemptOverride ? overrideReasonCode.trim() : null,
                  reasonNote: attemptOverride ? overrideReasonNote.trim() || null : null,
                });
              }}
            >
              Validate label block
            </button>
            {mutations.validateLabelBlocking.isPending && (
              <p className="text-muted-foreground flex items-center gap-2 text-sm">
                <RefreshCw className="size-4 animate-spin" />
                Validating label readiness
              </p>
            )}
            {labelBlockingResult && (
              <div className="space-y-2 rounded-md border p-3 text-sm">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="font-medium">{labelBlockingResult.decision}</span>
                  <span className="rounded-md border px-2 py-1 text-xs">
                    {labelBlockingResult.policyMode}
                  </span>
                </div>
                <p className={labelBlockingResult.blocked ? 'text-destructive' : undefined}>
                  {labelBlockingResult.reason}
                </p>
                {labelBlockingResult.matchedPrintJobCode && (
                  <p className="text-muted-foreground">
                    Matched print job: {labelBlockingResult.matchedPrintJobCode}
                  </p>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
