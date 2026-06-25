import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import { PRECEDENCE_ORDER } from '@modules/WarehouseProfile/Domain/Constants/PrecedenceOrder';
import type { RuleDefinition } from '@modules/WarehouseProfile/Domain/Entities/RuleDefinition';
import type { RuleGroup } from '@modules/WarehouseProfile/Domain/Entities/RuleGroup';
import { PrecedenceMatrix } from '@modules/WarehouseProfile/Presentation/Components/PrecedenceMatrix';

function rule(id: string, tier: RuleDefinition['precedenceTier'], mode: RuleDefinition['controlMode']): RuleDefinition {
  return {
    id,
    ruleCode: id.toUpperCase(),
    ruleName: `Rule ${id}`,
    ruleGroupId: 'g-1',
    precedenceTier: tier,
    controlMode: mode,
    status: 'ACTIVE',
    warehouseTypeCode: 'DC',
    warehouseId: null,
    zoneId: null,
    locationType: null,
    ownerId: null,
    skuId: null,
    itemClass: null,
    orderType: null,
    customerId: null,
    supplierId: null,
    scopeKey: 'DC',
    conditionJson: {},
    actionJson: {},
    priority: 100,
    effectiveFrom: '2026-06-01T00:00:00.000Z',
    effectiveTo: null,
    requiresReason: false,
    requiresEvidence: false,
    allowOverride: false,
    sourceSystem: null,
    referenceId: null,
    createdAt: '2026-06-01T00:00:00.000Z',
    updatedAt: '2026-06-01T00:00:00.000Z',
    createdBy: null,
    updatedBy: null,
  };
}

const groups: RuleGroup[] = [
  {
    id: 'g-1',
    groupCode: 'COMP',
    groupName: 'Compliance group',
    description: null,
    catalogState: 'ACTIVE',
    displayOrder: 1,
    sourceSystem: null,
    referenceId: null,
    createdAt: '2026-06-01T00:00:00.000Z',
    updatedAt: '2026-06-01T00:00:00.000Z',
    createdBy: null,
    updatedBy: null,
  },
];

describe('PRECEDENCE_ORDER constant', () => {
  it('is the immutable Compliance>Integrity>Physical>Owner/Contract>Operation>Optimization order', () => {
    expect(PRECEDENCE_ORDER.map((entry) => entry.tier)).toEqual([
      'COMPLIANCE',
      'INTEGRITY',
      'PHYSICAL',
      'OWNER_CONTRACT',
      'OPERATION',
      'OPTIMIZATION',
    ]);
  });
});

describe('PrecedenceMatrix', () => {
  it('renders all six tiers in the fixed order regardless of incoming data order', () => {
    // Rules supplied OUT of precedence order to prove the matrix does not sort by data.
    const rules = [rule('opt', 'OPTIMIZATION', 'AUTO_SUGGESTION'), rule('comp', 'COMPLIANCE', 'HARD_BLOCK')];
    const html = renderToStaticMarkup(<PrecedenceMatrix tiers={PRECEDENCE_ORDER} rules={rules} groups={groups} />);

    const indices = ['Tuân thủ', 'Toàn vẹn', 'Vật lý', 'Chủ hàng / Hợp đồng', 'Vận hành', 'Tối ưu'].map(
      (label) => html.indexOf(label),
    );
    // Every label present and strictly increasing => fixed top-to-bottom order.
    expect(indices.every((value) => value >= 0)).toBe(true);
    expect([...indices].sort((a, b) => a - b)).toEqual(indices);
  });

  it('exposes NO reorder / drag / sort control on the tiers', () => {
    const html = renderToStaticMarkup(<PrecedenceMatrix tiers={PRECEDENCE_ORDER} rules={[]} groups={groups} />);
    expect(html.toLowerCase()).not.toContain('draggable');
    expect(html.toLowerCase()).not.toContain('reorder');
    expect(html).not.toContain('aria-roledescription="sortable"');
    // No interactive control to move a tier up/down.
    expect(html.toLowerCase()).not.toContain('move up');
    expect(html.toLowerCase()).not.toContain('move down');
  });

  it('groups each rule under its tier and shows its control-mode label', () => {
    const rules = [rule('comp', 'COMPLIANCE', 'HARD_BLOCK'), rule('owner', 'OWNER_CONTRACT', 'APPROVAL_REQUIRED')];
    const html = renderToStaticMarkup(<PrecedenceMatrix tiers={PRECEDENCE_ORDER} rules={rules} groups={groups} />);

    expect(html).toContain('COMP'); // rule code
    expect(html).toContain('Chặn cứng');
    expect(html).toContain('OWNER'); // rule code
    expect(html).toContain('Yêu cầu phê duyệt');
  });

  it('shows an empty hint for a tier with no rules', () => {
    const html = renderToStaticMarkup(<PrecedenceMatrix tiers={PRECEDENCE_ORDER} rules={[]} groups={groups} />);
    expect(html).toContain('Không có quy tắc trong tầng này.');
  });

  it('renders the condition + action JSON read-only for each rule (Finding #3 / OQ3)', () => {
    const compRule: RuleDefinition = {
      ...rule('comp', 'COMPLIANCE', 'HARD_BLOCK'),
      conditionJson: { hazmatClass: { in: ['3', '8'] } },
      actionJson: { block: true },
    };
    const html = renderToStaticMarkup(
      <PrecedenceMatrix tiers={PRECEDENCE_ORDER} rules={[compRule]} groups={groups} />,
    );
    // Labels identify the two read-only JSON views.
    expect(html).toContain('Điều kiện');
    expect(html).toContain('Hành động');
    // The serialized JSON content is shown (read-only display, not an editor).
    expect(html).toContain('hazmatClass');
    expect(html).toContain('&quot;block&quot;: true');
    // It is a static display, not an editable control.
    expect(html).not.toContain('<textarea');
    expect(html).not.toContain('contenteditable');
  });
});
