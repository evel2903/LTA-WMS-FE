import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import type { RuleDefinition } from '@modules/WarehouseProfile/Domain/Entities/RuleDefinition';
import type { WarehouseProfileRule } from '@modules/WarehouseProfile/Domain/Entities/WarehouseProfileRule';
import { ProfileRulesPanel } from '@modules/WarehouseProfile/Presentation/Components/ProfileRulesPanel';

const now = '2026-06-18T00:00:00.000Z';

function ruleDef(overrides: Partial<RuleDefinition> = {}): RuleDefinition {
  return {
    id: 'rule-1',
    ruleCode: 'COMP-001',
    ruleName: 'No hazmat in ambient',
    ruleGroupId: 'group-1',
    precedenceTier: 'COMPLIANCE',
    controlMode: 'HARD_BLOCK',
    status: 'ACTIVE',
    warehouseTypeCode: null,
    scopeKey: 'DC',
    conditionJson: {},
    actionJson: {},
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

function profileRule(overrides: Partial<WarehouseProfileRule> = {}): WarehouseProfileRule {
  return {
    id: 'pr-1',
    warehouseProfileId: 'profile-1',
    ruleDefinitionId: 'rule-1',
    isEnabled: true,
    overridePriority: null,
    sourceSystem: null,
    referenceId: null,
    createdAt: now,
    updatedAt: now,
    createdBy: null,
    updatedBy: null,
    ...overrides,
  };
}

describe('ProfileRulesPanel (Finding #2 — profile-rule assignment UI)', () => {
  it('lists each attached rule with its definition code + name', () => {
    const html = renderToStaticMarkup(
      <ProfileRulesPanel
        profileRules={[profileRule()]}
        ruleDefinitions={[ruleDef()]}
        onAdd={() => undefined}
        onRemove={() => undefined}
      />,
    );
    expect(html).toContain('COMP-001');
    expect(html).toContain('No hazmat in ambient');
    // A detach control exists for the attached rule.
    expect(html).toContain('Gỡ bỏ');
  });

  it('wraps long attached rule identifiers inside the membership list', () => {
    const html = renderToStaticMarkup(
      <ProfileRulesPanel
        profileRules={[profileRule()]}
        ruleDefinitions={[
          ruleDef({
            ruleCode: 'RULE-WITH-A-VERY-LONG-CODE-THAT-SHOULD-WRAP',
            ruleName: 'Tên quy tắc rất dài để kiểm tra không làm tràn ngang danh sách membership',
          }),
        ]}
        onAdd={() => undefined}
        onRemove={() => undefined}
      />,
    );

    expect(html).toContain('RULE-WITH-A-VERY-LONG-CODE-THAT-SHOULD-WRAP');
    expect(html).toContain('min-w-0');
    expect(html).toContain('break-words');
  });

  it('renders an attach control offering only rules NOT already attached', () => {
    const html = renderToStaticMarkup(
      <ProfileRulesPanel
        profileRules={[profileRule({ ruleDefinitionId: 'rule-1' })]}
        ruleDefinitions={[
          ruleDef({ id: 'rule-1', ruleCode: 'COMP-001' }),
          ruleDef({ id: 'rule-2', ruleCode: 'INT-002', ruleName: 'Lot integrity' }),
        ]}
        onAdd={() => undefined}
        onRemove={() => undefined}
      />,
    );
    // The not-yet-attached rule is offered as an option...
    expect(html).toContain('INT-002');
    // ...and the attach button is present.
    expect(html).toContain('Thêm quy tắc');
    // The already-attached rule must NOT appear as a selectable <option>.
    expect(html).not.toContain('<option value="rule-1"');
  });

  it('shows an empty state when no rules are attached', () => {
    const html = renderToStaticMarkup(
      <ProfileRulesPanel
        profileRules={[]}
        ruleDefinitions={[ruleDef()]}
        onAdd={() => undefined}
        onRemove={() => undefined}
      />,
    );
    expect(html).toContain('Chưa gắn quy tắc nào.');
    expect(html).toContain('role="status"');
  });

  it('keeps the add action disabled when there is no attachable rule', () => {
    const html = renderToStaticMarkup(
      <ProfileRulesPanel
        profileRules={[profileRule({ ruleDefinitionId: 'rule-1' })]}
        ruleDefinitions={[ruleDef({ id: 'rule-1' })]}
        onAdd={() => undefined}
        onRemove={() => undefined}
      />,
    );

    expect(html).toContain('Chọn quy tắc...');
    expect(html).toContain('disabled');
    expect(html).not.toContain('<option value="rule-1"');
  });

  it('disables the attach + remove controls when read-only', () => {
    const html = renderToStaticMarkup(
      <ProfileRulesPanel
        profileRules={[profileRule()]}
        ruleDefinitions={[ruleDef()]}
        canEdit={false}
        onAdd={() => undefined}
        onRemove={() => undefined}
      />,
    );
    expect(html).toContain('disabled');
    expect(html).toContain('role="status"');
  });
});
