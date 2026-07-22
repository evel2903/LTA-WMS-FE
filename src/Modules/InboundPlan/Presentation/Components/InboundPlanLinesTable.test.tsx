// @vitest-environment jsdom
import { cleanup, render, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';

import { InboundPlanLinesTable } from '@modules/InboundPlan/Presentation/Components/InboundPlanLinesTable';
import type { InboundPlanLine } from '@modules/InboundPlan/Domain/Types/InboundPlan';

afterEach(() => cleanup());

function line(overrides: Partial<InboundPlanLine> = {}): InboundPlanLine {
  return {
    id: 'line-1',
    lineNumber: 1,
    skuId: 'sku-1',
    skuCode: 'SKU-1',
    uomId: 'uom-1',
    uomCode: 'EA',
    expectedQuantity: 12,
    externalLineReference: 'LINE-01',
    ...overrides,
  };
}

describe('InboundPlanLinesTable', () => {
  it('renders every line with its SKU/UOM/expected quantity/external reference', () => {
    render(
      <InboundPlanLinesTable
        lines={[
          line({
            id: 'line-2',
            lineNumber: 2,
            skuCode: 'SKU-2',
            uomCode: 'PCS',
            expectedQuantity: 5,
            externalLineReference: 'LINE-02',
          }),
          line({ id: 'line-1', lineNumber: 1 }),
        ]}
      />,
    );

    const rowLine1 = screen.getByTestId('inbound-plan-line-row-line-1');
    expect(within(rowLine1).getByText('1')).toBeTruthy();
    expect(within(rowLine1).getByText('SKU-1')).toBeTruthy();
    expect(within(rowLine1).getByText('EA')).toBeTruthy();
    expect(within(rowLine1).getByText('12')).toBeTruthy();
    expect(within(rowLine1).getByText('LINE-01')).toBeTruthy();

    const rowLine2 = screen.getByTestId('inbound-plan-line-row-line-2');
    expect(within(rowLine2).getByText('2')).toBeTruthy();
    expect(within(rowLine2).getByText('SKU-2')).toBeTruthy();
    expect(within(rowLine2).getByText('PCS')).toBeTruthy();
    expect(within(rowLine2).getByText('5')).toBeTruthy();
    expect(within(rowLine2).getByText('LINE-02')).toBeTruthy();
  });

  it('sorts rows by lineNumber ascending as numbers, not lexicographically as strings', () => {
    render(
      <InboundPlanLinesTable
        lines={[
          line({ id: 'line-10', lineNumber: 10 }),
          line({ id: 'line-1', lineNumber: 1 }),
          line({ id: 'line-2', lineNumber: 2 }),
        ]}
      />,
    );

    // A lexicographic (string) sort would order these "1", "10", "2" -- only a genuine
    // numeric comparator produces 1, 2, 10.
    const rows = screen.getAllByTestId(/inbound-plan-line-row-/);
    expect(rows.map((row) => row.getAttribute('data-testid'))).toEqual([
      'inbound-plan-line-row-line-1',
      'inbound-plan-line-row-line-2',
      'inbound-plan-line-row-line-10',
    ]);
  });

  it('falls back to the raw id/blank/"không có" when skuCode/uomCode/externalLineReference are null, matching InboundLineRail', () => {
    render(
      <InboundPlanLinesTable
        lines={[
          line({
            skuCode: null,
            skuId: 'sku-deactivated-id',
            uomCode: null,
            externalLineReference: null,
          }),
        ]}
      />,
    );

    const row = screen.getByTestId('inbound-plan-line-row-line-1');
    expect(within(row).getByText('sku-deactivated-id')).toBeTruthy();
    expect(within(row).getByText('không có')).toBeTruthy();
    // uomCode null falls back to an empty cell (matching InboundLineRail's `?? ''`), not a
    // placeholder string -- assert the UOM cell (3rd column) renders no text at all.
    const cells = within(row).getAllByRole('cell');
    expect(cells[2].textContent).toBe('');
  });

  it('shows an empty-state message instead of a header-only table when the plan has no lines', () => {
    render(<InboundPlanLinesTable lines={[]} />);

    expect(screen.getByText('Kế hoạch này chưa có dòng hàng nào.')).toBeTruthy();
    expect(screen.queryAllByTestId(/inbound-plan-line-row-/)).toHaveLength(0);
    // Assert the table itself is gone too, not just the (zero) row count -- proves the
    // empty state replaces the table rather than merely having nothing to iterate over.
    expect(screen.queryByRole('table')).toBeNull();
    expect(screen.queryByText('Số dòng')).toBeNull();
  });
});
