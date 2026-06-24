// @vitest-environment jsdom
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ROUTES } from '@app/Config/Routes';
import { ApiError } from '@shared/Services/Http/ApiError';
import type { PaginatedResponse } from '@shared/Types/Api';
import type { IBarcodeLabelRepository } from '@modules/BarcodeLabel/Application/Interfaces/IBarcodeLabelRepository';
import type {
  LabelBlockingValidationResult,
  LabelTemplate,
  PrintJob,
} from '@modules/BarcodeLabel/Domain/Types/BarcodeLabel';
import type {
  CreateLabelTemplateInput,
  CreateLabelTemplateVersionInput,
  LabelTemplateListFilter,
  PreviewPrintJobInput,
  PrintJobListFilter,
  ReprintPrintJobInput,
  ValidateLabelBlockingInput,
} from '@modules/BarcodeLabel/Domain/Types/BarcodeLabelQuery';

const repo = vi.hoisted(() => ({ current: null as unknown as IBarcodeLabelRepository }));
vi.mock('@modules/BarcodeLabel/Infrastructure/Repositories/BarcodeLabelRepositoryInstance', () => ({
  get barcodeLabelRepository() {
    return repo.current;
  },
}));

import {
  BarcodeLabelCreatePage,
  BarcodeLabelPrintJobDetailPage,
  BarcodeLabelTemplateDetailPage,
} from '@modules/BarcodeLabel/Presentation/Pages/BarcodeLabelDetailPage';
import { BarcodeLabelPage } from '@modules/BarcodeLabel/Presentation/Pages/BarcodeLabelPage';

function page<T>(items: T[]): PaginatedResponse<T> {
  return { items, page: 1, pageSize: 50, totalItems: items.length, totalPages: 1 };
}

function makeTemplate(overrides: Partial<LabelTemplate> = {}): LabelTemplate {
  return {
    id: 'template-1',
    templateCode: 'LPN-STD',
    templateName: 'LPN Standard',
    labelType: 'LPN',
    status: 'Active',
    requiredFields: ['BarcodeValue', 'OwnerCode'],
    templateBody: 'LPN {{BarcodeValue}}',
    activeVersionId: 'version-1',
    createdAt: '2026-06-22T08:00:00.000Z',
    updatedAt: '2026-06-22T08:00:00.000Z',
    createdBy: 'user-1',
    updatedBy: 'user-1',
    ...overrides,
  };
}

function makePrintJob(overrides: Partial<PrintJob> = {}): PrintJob {
  return {
    id: 'job-1',
    jobCode: 'PJ-001',
    templateId: 'template-1',
    templateVersionId: 'version-1',
    businessObjectType: 'LPN',
    businessObjectId: 'lpn-1',
    businessObjectCode: 'LPN0001',
    warehouseId: 'warehouse-a',
    ownerId: 'owner-a',
    payloadJson: { BarcodeValue: 'SSCC-1', OwnerCode: 'OWN' },
    previewContent: 'LPN SSCC-1',
    status: 'Previewed',
    validationErrors: null,
    reprintCount: 0,
    requestedBy: 'user-1',
    requestedAt: '2026-06-22T08:30:00.000Z',
    completedAt: '2026-06-22T08:30:00.000Z',
    createdAt: '2026-06-22T08:30:00.000Z',
    updatedAt: '2026-06-22T08:30:00.000Z',
    createdBy: 'user-1',
    updatedBy: 'user-1',
    ...overrides,
  };
}

function makeBlockingResult(
  overrides: Partial<LabelBlockingValidationResult> = {},
): LabelBlockingValidationResult {
  return {
    allowed: false,
    blocked: true,
    decision: 'Blocked',
    requiredLabelType: 'LPN',
    policyMode: 'hard',
    overrideAllowed: false,
    overrideAccepted: false,
    reason: 'Required label evidence is missing.',
    matchedPrintJobId: null,
    matchedPrintJobCode: null,
    validationDetails: { DownstreamAction: 'putaway' },
    ...overrides,
  };
}

class FakeRepository implements Partial<IBarcodeLabelRepository> {
  public templates: LabelTemplate[];
  public printJobs: PrintJob[];

  constructor(templates: LabelTemplate[] = [makeTemplate()], printJobs: PrintJob[] = []) {
    this.templates = templates;
    this.printJobs = printJobs;
  }

  listTemplates = vi.fn((filter?: LabelTemplateListFilter) =>
    Promise.resolve(
      page(
        this.templates.filter((template) => {
          if (filter?.status && template.status !== filter.status) return false;
          if (filter?.templateCode && !template.templateCode.includes(filter.templateCode)) return false;
          return true;
        }),
      ),
    ),
  );

  getTemplateById = vi.fn((id: string) => {
    const template = this.templates.find((item) => item.id === id);
    return template
      ? Promise.resolve(template)
      : Promise.reject(new ApiError({ status: 404, code: 'NOT_FOUND', message: 'Template not found' }));
  });

  listPrintJobs = vi.fn((filter?: PrintJobListFilter) =>
    Promise.resolve(
      page(
        this.printJobs.filter((job) => {
          if (filter?.templateId && job.templateId !== filter.templateId) return false;
          if (filter?.businessObjectId && job.businessObjectId !== filter.businessObjectId) return false;
          if (filter?.status && job.status !== filter.status) return false;
          return true;
        }),
      ),
    ),
  );

  getPrintJobById = vi.fn((id: string) => {
    const job = this.printJobs.find((item) => item.id === id);
    return job
      ? Promise.resolve(job)
      : Promise.reject(new ApiError({ status: 404, code: 'NOT_FOUND', message: 'Print job not found' }));
  });

  createTemplate = vi.fn((input: CreateLabelTemplateInput) => {
    const template = makeTemplate({
      id: 'template-new',
      templateCode: input.templateCode,
      templateName: input.templateName,
      labelType: input.labelType,
      requiredFields: input.requiredFields,
      templateBody: input.templateBody,
    });
    this.templates = [template, ...this.templates];
    return Promise.resolve(template);
  });

  createTemplateVersion = vi.fn((id: string, input: CreateLabelTemplateVersionInput) => {
    const index = this.templates.findIndex((template) => template.id === id);
    const template = {
      ...(this.templates[index] ?? makeTemplate({ id })),
      requiredFields: input.requiredFields,
      templateBody: input.templateBody,
      activeVersionId: 'version-2',
    };
    this.templates[index >= 0 ? index : 0] = template;
    return Promise.resolve(template);
  });

  previewPrintJob = vi.fn((input: PreviewPrintJobInput) => {
    const job = makePrintJob({
      id: 'job-preview',
      templateId: input.templateId,
      businessObjectType: input.businessObjectType,
      businessObjectId: input.businessObjectId,
      businessObjectCode: input.businessObjectCode ?? null,
      warehouseId: input.warehouseId ?? null,
      ownerId: input.ownerId ?? null,
      payloadJson: input.payloadJson,
      previewContent: `LPN ${String(input.payloadJson.BarcodeValue)}`,
    });
    this.printJobs = [job, ...this.printJobs];
    return Promise.resolve(job);
  });

  reprintPrintJob = vi.fn((id: string, _input: ReprintPrintJobInput) => {
    const job = makePrintJob({ id, status: 'Reprinted', reprintCount: 1 });
    this.printJobs = [job, ...this.printJobs.filter((item) => item.id !== id)];
    return Promise.resolve(job);
  });

  validateLabelBlocking = vi.fn((_input: ValidateLabelBlockingInput) =>
    Promise.resolve(makeBlockingResult()),
  );
}

function renderWithClient(ui: React.ReactElement, initialEntries = ['/labels']) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={initialEntries}>{ui}</MemoryRouter>
    </QueryClientProvider>,
  );
}

function renderListPage() {
  return renderWithClient(<BarcodeLabelPage />);
}

function renderTemplateDetail(path = '/labels/templates/template-1') {
  return renderWithClient(
    <Routes>
      <Route path={ROUTES.LABELS.TEMPLATE_DETAIL()} element={<BarcodeLabelTemplateDetailPage />} />
      <Route path={ROUTES.LABELS.TEMPLATE_ACTION()} element={<BarcodeLabelTemplateDetailPage />} />
    </Routes>,
    [path],
  );
}

function renderPrintJobDetail(path = '/labels/print-jobs/job-1') {
  return renderWithClient(
    <Routes>
      <Route path={ROUTES.LABELS.PRINT_JOB_DETAIL()} element={<BarcodeLabelPrintJobDetailPage />} />
      <Route path={ROUTES.LABELS.PRINT_JOB_ACTION()} element={<BarcodeLabelPrintJobDetailPage />} />
    </Routes>,
    [path],
  );
}

function renderCreatePage() {
  return renderWithClient(
    <Routes>
      <Route path={ROUTES.LABELS.NEW} element={<BarcodeLabelCreatePage />} />
      <Route path={ROUTES.LABELS.TEMPLATE_DETAIL()} element={<BarcodeLabelTemplateDetailPage />} />
    </Routes>,
    ['/labels/new'],
  );
}

afterEach(() => {
  cleanup();
});

describe('BarcodeLabel list/detail pages', () => {
  it('renders template and print job links while keeping action forms off the root list', async () => {
    const fake = new FakeRepository([makeTemplate()], [makePrintJob()]);
    repo.current = fake;
    renderListPage();

    const templateLink = await screen.findByRole('link', { name: /LPN-STD/i });
    const printJobLink = await screen.findByRole('link', { name: /PJ-001/i });
    expect(templateLink.getAttribute('href')).toBe('/labels/templates/template-1');
    expect(printJobLink.getAttribute('href')).toBe('/labels/print-jobs/job-1');
    expect(screen.queryByRole('button', { name: 'Preview print job' })).toBeNull();
    expect(screen.getByRole('link', { name: /new template/i })).toBeTruthy();
  });

  it('creates templates on the create route and passes required fields as an array', async () => {
    const actor = userEvent.setup();
    const fake = new FakeRepository();
    repo.current = fake;
    renderCreatePage();

    await screen.findByText('New label template');
    await actor.click(screen.getByRole('button', { name: 'Create template' }));

    await waitFor(() =>
      expect(fake.createTemplate).toHaveBeenCalledWith(
        expect.objectContaining({
          templateCode: 'LPN-STD',
          requiredFields: ['BarcodeValue', 'OwnerCode'],
        }),
      ),
    );
  });

  it('creates a template version and payload preview from the template detail route', async () => {
    const actor = userEvent.setup();
    const fake = new FakeRepository();
    repo.current = fake;
    renderTemplateDetail('/labels/templates/template-1/preview');

    await screen.findByText('LPN-STD');
    expect(fake.getTemplateById).toHaveBeenCalledWith('template-1');
    await actor.click(screen.getByRole('button', { name: 'Create new version' }));
    await waitFor(() =>
      expect(fake.createTemplateVersion).toHaveBeenCalledWith('template-1', {
        requiredFields: ['BarcodeValue', 'OwnerCode'],
        templateBody: 'LPN {{BarcodeValue}}',
      }),
    );

    await actor.click(screen.getByRole('button', { name: 'Preview print job' }));
    await waitFor(() =>
      expect(fake.previewPrintJob).toHaveBeenCalledWith(
        expect.objectContaining({
          templateId: 'template-1',
          businessObjectType: 'LPN',
          businessObjectId: 'lpn-1',
          payloadJson: { BarcodeValue: 'SSCC-1', OwnerCode: 'OWN' },
        }),
      ),
    );
    expect(await screen.findByText(/LPN SSCC-1/i)).toBeTruthy();
  });

  it('validates JSON locally before creating a preview on detail route', async () => {
    const actor = userEvent.setup();
    const fake = new FakeRepository();
    repo.current = fake;
    renderTemplateDetail();

    await screen.findByText('LPN-STD');
    expect(fake.getTemplateById).toHaveBeenCalledWith('template-1');
    fireEvent.change(screen.getByLabelText('Payload JSON'), { target: { value: '{bad-json' } });
    await actor.click(screen.getByRole('button', { name: 'Preview print job' }));

    expect(await screen.findByText(/Payload JSON is invalid/i)).toBeTruthy();
    expect(fake.previewPrintJob).not.toHaveBeenCalled();
  });

  it('submits reprint with reason code from print job detail route', async () => {
    const actor = userEvent.setup();
    const fake = new FakeRepository([makeTemplate()], [makePrintJob()]);
    repo.current = fake;
    renderPrintJobDetail('/labels/print-jobs/job-1/reprint');

    await screen.findByRole('heading', { name: 'PJ-001' });
    expect(fake.getPrintJobById).toHaveBeenCalledWith('job-1');
    await actor.click(screen.getByRole('button', { name: 'Reprint job' }));

    await waitFor(() =>
      expect(fake.reprintPrintJob).toHaveBeenCalledWith('job-1', {
        reasonCode: 'RC-V1-REPRINT',
        reasonNote: 'Label damaged',
      }),
    );
  });

  it('shows permission denied state on root list and hides mutation controls', async () => {
    const fake = new FakeRepository();
    fake.listTemplates = vi.fn(() =>
      Promise.reject(new ApiError({ status: 403, code: 'FORBIDDEN', message: 'No label read' })),
    );
    repo.current = fake;
    renderListPage();

    expect((await screen.findAllByText(/permission denied/i)).length).toBeGreaterThan(0);
    expect(screen.queryByRole('button', { name: 'Preview print job' })).toBeNull();
  });

  it('validates label blocking readiness and renders blocked decision on detail route', async () => {
    const actor = userEvent.setup();
    const fake = new FakeRepository();
    repo.current = fake;
    renderTemplateDetail('/labels/templates/template-1/blocking');

    await screen.findByText('LPN-STD');
    await actor.click(screen.getByRole('button', { name: 'Validate label block' }));

    await waitFor(() =>
      expect(fake.validateLabelBlocking).toHaveBeenCalledWith(
        expect.objectContaining({
          downstreamAction: 'putaway',
          businessObjectType: 'LPN',
          businessObjectId: 'lpn-1',
          warehouseProfileId: 'profile-1',
          labelType: 'LPN',
        }),
      ),
    );
    expect(await screen.findByText(/Required label evidence is missing/i)).toBeTruthy();
  });

  it('requires an override reason before submitting label block override', async () => {
    const actor = userEvent.setup();
    const fake = new FakeRepository();
    repo.current = fake;
    renderTemplateDetail();

    await screen.findByText('LPN-STD');
    await actor.click(screen.getByLabelText('Attempt override'));
    fireEvent.change(screen.getByLabelText('Override reason code'), { target: { value: '' } });

    expect(
      screen.getByRole<HTMLButtonElement>('button', { name: 'Validate label block' }).disabled,
    ).toBe(true);
  });
});
