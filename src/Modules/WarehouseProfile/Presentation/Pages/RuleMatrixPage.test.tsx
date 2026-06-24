// @vitest-environment jsdom
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { ROUTES } from '@app/Config/Routes';
import { ApiError } from '@shared/Services/Http/ApiError';
import type { IWarehouseProfileRepository } from '@modules/WarehouseProfile/Application/Interfaces/IWarehouseProfileRepository';
import type { RuleDefinition } from '@modules/WarehouseProfile/Domain/Entities/RuleDefinition';
import type { RulePreview } from '@modules/WarehouseProfile/Domain/Entities/RulePreview';
import type { PreviewContextInput } from '@modules/WarehouseProfile/Domain/Types/WarehouseProfileInputs';
import type { PaginatedResponse } from '@shared/Types/Api';

const repo = vi.hoisted(() => ({ current: null as unknown as IWarehouseProfileRepository }));
vi.mock(
  '@modules/WarehouseProfile/Infrastructure/Repositories/WarehouseProfileRepositoryInstance',
  () => ({
    get warehouseProfileRepository() {
      return repo.current;
    },
  }),
);

import { RuleMatrixPage } from '@modules/WarehouseProfile/Presentation/Pages/RuleMatrixPage';
import { RuleMatrixPreviewPage } from '@modules/WarehouseProfile/Presentation/Pages/RuleMatrixPreviewPage';

const now = '2026-06-18T00:00:00.000Z';

function page<T>(items: T[]): PaginatedResponse<T> {
  return { items, page: 1, pageSize: 100, totalItems: items.length, totalPages: 1 };
}

function ruleDef(overrides: Partial<RuleDefinition> = {}): RuleDefinition {
  return {
    id: 'rule-1',
    ruleCode: 'COMP-001',
    ruleName: 'No hazmat in ambient',
    ruleGroupId: 'g-1',
    precedenceTier: 'COMPLIANCE',
    controlMode: 'HARD_BLOCK',
    status: 'ACTIVE',
    warehouseTypeCode: null,
    scopeKey: 'DC',
    conditionJson: { hazmatClass: { in: ['3'] } },
    actionJson: { block: true },
    priority: 100,
    effectiveFrom: now,
    effectiveTo: null,
    requiresReason: false,
    requiresEvidence: false,
    allowOverride: false,
    warehouseId: null,
    zoneId: null,
    locationType: null,
    ownerId: null,
    skuId: null,
    itemClass: null,
    orderType: null,
    customerId: null,
    supplierId: null,
    sourceSystem: null,
    referenceId: null,
    createdAt: now,
    updatedAt: now,
    createdBy: null,
    updatedBy: null,
    ...overrides,
  };
}

const previewWithWinner: RulePreview = {
  winner: {
    ruleCode: 'COMP-001',
    ruleName: 'No hazmat in ambient',
    precedenceTier: 'COMPLIANCE',
    controlMode: 'HARD_BLOCK',
  },
  allowed: false,
  approvalRequired: false,
  controlMode: { mode: 'HARD_BLOCK', isHardBlock: true, approvalRequired: false, warning: null, suggestion: null },
  skippedRules: [],
  conflicts: [],
  reasonReadiness: null,
  actorContext: { actorUserId: null, action: null, objectType: null, objectId: null, reasonCode: null },
};

class FakeRepository implements Partial<IWarehouseProfileRepository> {
  listRuleGroups = vi.fn(() => Promise.resolve(page([])));
  listRuleDefinitions = vi.fn(() => Promise.resolve(page([ruleDef()])));
  previewContexts: PreviewContextInput[] = [];
  preview = vi.fn((context: PreviewContextInput) => {
    this.previewContexts.push(context);
    return Promise.resolve(previewWithWinner);
  });
}

function renderPage(initialPath: string = ROUTES.FOUNDATION.RULE_MATRIX) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={[initialPath]}>
        <Routes>
          <Route path={ROUTES.FOUNDATION.RULE_MATRIX} element={<RuleMatrixPage />} />
          <Route path={ROUTES.FOUNDATION.RULE_MATRIX_PREVIEW} element={<RuleMatrixPreviewPage />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

afterEach(() => cleanup());
beforeEach(() => undefined);

describe('RuleMatrixPage (AC3 fixed precedence order)', () => {
  it('renders the six tiers in the immutable order with no reorder control', async () => {
    repo.current = new FakeRepository() as unknown as IWarehouseProfileRepository;
    const { container } = renderPage();

    await screen.findByText('Compliance');
    const html = container.innerHTML;
    const order = ['Compliance', 'Integrity', 'Physical', 'Owner / Contract', 'Operation', 'Optimization'].map(
      (label) => html.indexOf(label),
    );
    expect(order.every((value) => value >= 0)).toBe(true);
    expect([...order].sort((a, b) => a - b)).toEqual(order);
    expect(html.toLowerCase()).not.toContain('draggable');
    expect(html.toLowerCase()).not.toContain('reorder');
  });

  it('shows the rule condition + action JSON read-only (Finding #3)', async () => {
    repo.current = new FakeRepository() as unknown as IWarehouseProfileRepository;
    renderPage();
    expect(await screen.findByText('Condition')).toBeTruthy();
    expect(await screen.findByText('Action')).toBeTruthy();
  });
});

describe('RuleMatrixPage preview panel (AC4)', () => {
  it('runs a preview and renders the winning rule from the response', async () => {
    const user = userEvent.setup();
    const fake = new FakeRepository();
    repo.current = fake as unknown as IWarehouseProfileRepository;
    renderPage(ROUTES.FOUNDATION.RULE_MATRIX_PREVIEW);

    const wtInput = await screen.findByRole('textbox', { name: /warehouse type code/i });
    await user.type(wtInput, 'DC');
    await user.click(screen.getByRole('button', { name: 'Run preview' }));

    await waitFor(() => expect(fake.preview).toHaveBeenCalled());
    // Winner rendered directly from the response (FE never recomputes).
    expect(await screen.findByText('Winning rule')).toBeTruthy();
    await waitFor(() => expect(screen.getAllByText(/COMP-001/).length).toBeGreaterThan(0));
    // The preview request carried the warehouseTypeCode and NEVER a profileId (contract).
    expect(fake.previewContexts[0]?.warehouseTypeCode).toBe('DC');
    expect('profileId' in (fake.previewContexts[0] as object)).toBe(false);
  });
});

describe('RuleMatrixPage AC5 states', () => {
  it('shows a permission-denied state when the catalog 403s', async () => {
    const fake = new FakeRepository();
    fake.listRuleDefinitions = vi.fn(() =>
      Promise.reject(new ApiError({ status: 403, code: 'FORBIDDEN', message: 'no' })),
    );
    fake.listRuleGroups = vi.fn(() =>
      Promise.reject(new ApiError({ status: 403, code: 'FORBIDDEN', message: 'no' })),
    );
    repo.current = fake as unknown as IWarehouseProfileRepository;
    renderPage();
    expect(await screen.findByText(/permission denied/i)).toBeTruthy();
  });
});
