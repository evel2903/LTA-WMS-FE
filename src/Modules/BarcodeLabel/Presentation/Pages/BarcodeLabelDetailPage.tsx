import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { RefreshCw, ShieldAlert } from 'lucide-react';

import { ROUTES } from '@app/Config/Routes';
import { ApiError } from '@shared/Services/Http/ApiError';
import { Card, CardContent, CardHeader, CardTitle } from '@shared/Components/Ui/Card';
import { Input } from '@shared/Components/Ui/Input';
import { DetailPageShell } from '@shared/Components/Page/DetailPageShell';
import { useBarcodeLabelMutations } from '@modules/BarcodeLabel/Application/Commands/UseBarcodeLabelMutations';
import {
  useLabelTemplate,
  usePrintJob,
} from '@modules/BarcodeLabel/Application/Queries/UseBarcodeLabels';
import {
  LABEL_BLOCKING_ACTIONS,
  LABEL_TYPES,
} from '@modules/BarcodeLabel/Domain/Constants/BarcodeLabelConstants';
import type {
  LabelBlockingDownstreamAction,
  LabelTemplateStatus,
  PrintJobStatus,
} from '@modules/BarcodeLabel/Domain/Types/BarcodeLabel';

type DetailMode = 'new' | 'template' | 'printJob';

const LABEL_ACTIONS = new Set(['version', 'preview', 'reprint', 'blocking']);

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

function BarcodeLabelDetailSurface({ mode }: { mode: DetailMode }) {
  const { templateId, printJobId, action } = useParams();
  const navigate = useNavigate();
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

  const templateQuery = useLabelTemplate(templateId ?? null, { enabled: mode === 'template' });
  const printJobQuery = usePrintJob(printJobId ?? null, { enabled: mode === 'printJob' });
  const selectedPrintJob = printJobQuery.data ?? null;
  const printJobTemplateQuery = useLabelTemplate(selectedPrintJob?.templateId ?? null, {
    enabled: mode === 'printJob' && Boolean(selectedPrintJob?.templateId),
  });
  const selectedTemplate = mode === 'printJob' ? printJobTemplateQuery.data ?? null : templateQuery.data ?? null;
  const mutations = useBarcodeLabelMutations();
  const resetValidateLabelBlocking = mutations.validateLabelBlocking.reset;
  const templateError = templateQuery.error instanceof ApiError ? templateQuery.error : null;
  const printJobError = printJobQuery.error instanceof ApiError ? printJobQuery.error : null;
  const printJobTemplateError = printJobTemplateQuery.error instanceof ApiError ? printJobTemplateQuery.error : null;
  const mutationError = [
    mutations.createTemplate.error,
    mutations.createTemplateVersion.error,
    mutations.previewPrintJob.error,
    mutations.reprintPrintJob.error,
    mutations.validateLabelBlocking.error,
  ].find((error): error is ApiError => error instanceof ApiError);
  const denied = Boolean(
    (mode === 'template' && templateError?.isForbidden) ||
      (mode === 'printJob' && printJobError?.isForbidden),
  );
  const mutationDenied = Boolean(mutationError?.isForbidden);
  const isLoading =
    (mode === 'template' && templateQuery.isLoading) ||
    (mode === 'printJob' && printJobQuery.isLoading);
  const isMissingTemplate = mode === 'template' && !isLoading && (templateError?.status === 404 || !selectedTemplate);
  const isMissingPrintJob = mode === 'printJob' && !isLoading && (printJobError?.status === 404 || !selectedPrintJob);
  const state = denied
    ? 'forbidden'
    : isLoading
      ? 'loading'
      : isMissingTemplate || isMissingPrintJob
        ? 'notFound'
        : (mode === 'template' && templateQuery.error) || (mode === 'printJob' && printJobQuery.error)
        ? 'error'
        : null;
  const canCreateTemplate =
    templateCode.trim().length > 0 &&
    templateName.trim().length > 0 &&
    parseRequiredFields(requiredFields).length > 0 &&
    templateBody.trim().length > 0;
  const canPreview = Boolean(
    selectedTemplate && businessObjectType.trim() && businessObjectId.trim(),
  );
  const currentPreview = selectedPrintJob ?? mutations.previewPrintJob.data ?? null;
  const canReprint = Boolean(currentPreview && reasonCode.trim().length > 0);
  const canValidateLabelBlock = Boolean(
    businessObjectType.trim() &&
      businessObjectId.trim() &&
      blockingProfileId.trim() &&
      (!attemptOverride || overrideReasonCode.trim().length > 0),
  );
  const labelBlockingResult = mutations.validateLabelBlocking.data ?? null;

  useEffect(() => {
    if (action && !LABEL_ACTIONS.has(action)) {
      if (mode === 'template') void navigate(ROUTES.LABELS.TEMPLATE_DETAIL(templateId ?? ''), { replace: true });
      if (mode === 'printJob') void navigate(ROUTES.LABELS.PRINT_JOB_DETAIL(printJobId ?? ''), { replace: true });
    }
  }, [action, mode, navigate, printJobId, templateId]);

  useEffect(() => {
    if (!selectedTemplate) return;
    setTemplateCode(selectedTemplate.templateCode);
    setTemplateName(selectedTemplate.templateName);
    setRequiredFields(selectedTemplate.requiredFields.join(', '));
    setTemplateBody(selectedTemplate.templateBody);
    if (LABEL_TYPES.includes(selectedTemplate.labelType as (typeof LABEL_TYPES)[number])) {
      setLabelType(selectedTemplate.labelType as (typeof LABEL_TYPES)[number]);
    }
  }, [selectedTemplate]);

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

  return (
    <DetailPageShell
      title={
        mode === 'new'
          ? 'New label template'
          : selectedPrintJob?.jobCode ?? selectedTemplate?.templateCode ?? 'Label detail'
      }
      subtitle={
        mode === 'new'
          ? 'Create a template away from the label list page'
          : mode === 'printJob'
            ? 'Print job detail, preview and reprint action surface'
            : 'Template detail, version and preview action surface'
      }
      backTo={ROUTES.LABELS.ROOT}
      backLabel="Back to labels"
      status={
        selectedPrintJob ? (
          <StatusBadge status={selectedPrintJob.status} />
        ) : selectedTemplate ? (
          <StatusBadge status={selectedTemplate.status} />
        ) : null
      }
      summary={
        selectedPrintJob ? (
          <>
            <span>{selectedPrintJob.businessObjectType}</span>
            <span>{selectedPrintJob.businessObjectCode ?? selectedPrintJob.businessObjectId}</span>
            <span>Reprints: {selectedPrintJob.reprintCount}</span>
          </>
        ) : selectedTemplate ? (
          <>
            <span>{selectedTemplate.templateName}</span>
            <span>{selectedTemplate.labelType}</span>
            <span>{selectedTemplate.requiredFields.join(', ')}</span>
          </>
        ) : null
      }
      state={state}
      stateTitle={
        denied
          ? 'Permission denied'
          : (mode === 'template' && templateQuery.error) || (mode === 'printJob' && printJobQuery.error)
            ? 'Unable to load label detail'
            : undefined
      }
      stateMessage={
        denied
          ? 'Permission denied for label detail.'
          : (mode === 'template' && templateQuery.error) || (mode === 'printJob' && printJobQuery.error)
            ? 'The label detail could not be loaded.'
            : 'The requested template or print job was not found.'
      }
    >
      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_420px]">
        <section className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Template setup</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {mutationDenied ? (
                <p className="text-destructive text-sm">
                  Permission denied for the requested label action.
                </p>
              ) : null}
              {printJobTemplateError ? (
                <p className="text-muted-foreground text-sm">
                  Template detail is not available for this print job, so preview/version actions are disabled.
                </p>
              ) : null}
              <label className="grid gap-1 text-sm">
                Template code
                <Input
                  value={templateCode}
                  onChange={(event) => setTemplateCode(event.target.value)}
                  readOnly={mode !== 'new'}
                />
              </label>
              <label className="grid gap-1 text-sm">
                Template name
                <Input
                  value={templateName}
                  onChange={(event) => setTemplateName(event.target.value)}
                  readOnly={mode !== 'new'}
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
                  disabled={mode !== 'new'}
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
              {mode === 'new' ? (
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
                        onSuccess: (createdTemplate) => {
                          void navigate(ROUTES.LABELS.TEMPLATE_DETAIL(createdTemplate.id));
                        },
                      },
                    )
                  }
                >
                  Create template
                </button>
              ) : (
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
                    mutations.createTemplateVersion.mutate({
                      id: selectedTemplate.id,
                      input: {
                        requiredFields: parseRequiredFields(requiredFields),
                        templateBody,
                      },
                    });
                  }}
                >
                  Create new version
                </button>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Payload preview and reprint</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
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
              {payloadError ? <p className="text-destructive text-sm">{payloadError}</p> : null}
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
              {mutations.previewPrintJob.isPending ? (
                <p className="text-muted-foreground flex items-center gap-2 text-sm">
                  <RefreshCw className="size-4 animate-spin" />
                  Creating preview
                </p>
              ) : null}
              {currentPreview ? (
                <div className="space-y-3 rounded-md border p-3 text-sm">
                  <div className="flex items-center justify-between gap-2">
                    <div className="font-medium">{currentPreview.jobCode}</div>
                    <StatusBadge status={currentPreview.status} />
                  </div>
                  <pre className="bg-muted/50 overflow-auto rounded-md p-3 text-xs whitespace-pre-wrap">
                    {currentPreview.previewContent ?? 'No preview content'}
                  </pre>
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
                      mutations.reprintPrintJob.mutate({
                        id: currentPreview.id,
                        input: {
                          reasonCode: reasonCode.trim(),
                          reasonNote: reasonNote.trim() || null,
                        },
                      })
                    }
                  >
                    Reprint job
                  </button>
                </div>
              ) : null}
            </CardContent>
          </Card>
        </section>

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
                  {LABEL_BLOCKING_ACTIONS.map((downstreamAction) => (
                    <option key={downstreamAction} value={downstreamAction}>
                      {downstreamAction}
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
            {attemptOverride ? (
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
            ) : null}
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
            {mutations.validateLabelBlocking.isPending ? (
              <p className="text-muted-foreground flex items-center gap-2 text-sm">
                <RefreshCw className="size-4 animate-spin" />
                Validating label readiness
              </p>
            ) : null}
            {labelBlockingResult ? (
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
                {labelBlockingResult.matchedPrintJobCode ? (
                  <p className="text-muted-foreground">
                    Matched print job: {labelBlockingResult.matchedPrintJobCode}
                  </p>
                ) : null}
              </div>
            ) : null}
          </CardContent>
        </Card>
      </div>
    </DetailPageShell>
  );
}

export function BarcodeLabelCreatePage() {
  return <BarcodeLabelDetailSurface mode="new" />;
}

export function BarcodeLabelTemplateDetailPage() {
  return <BarcodeLabelDetailSurface mode="template" />;
}

export function BarcodeLabelPrintJobDetailPage() {
  return <BarcodeLabelDetailSurface mode="printJob" />;
}
