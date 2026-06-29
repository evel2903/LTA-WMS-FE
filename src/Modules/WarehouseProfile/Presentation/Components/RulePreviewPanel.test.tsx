import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import type { RulePreview } from '@modules/WarehouseProfile/Domain/Entities/RulePreview';
import { RulePreviewPanel } from '@modules/WarehouseProfile/Presentation/Components/RulePreviewPanel';

function basePreview(overrides: Partial<RulePreview> = {}): RulePreview {
  return {
    winner: { ruleCode: 'NO-MIX', ruleName: 'No mixing', precedenceTier: 'COMPLIANCE', controlMode: 'HARD_BLOCK' },
    allowed: false,
    approvalRequired: false,
    controlMode: { mode: 'HARD_BLOCK', isHardBlock: true, approvalRequired: false, warning: null, suggestion: null },
    skippedRules: [],
    conflicts: [],
    reasonReadiness: { requiresReason: true, requiresEvidence: false, allowOverride: false },
    actorContext: { actorUserId: null, action: null, objectType: null, objectId: null, reasonCode: null },
    ...overrides,
  };
}

describe('RulePreviewPanel', () => {
  it('renders the winner rule with its tier and control mode', () => {
    const html = renderToStaticMarkup(<RulePreviewPanel preview={basePreview()} />);
    expect(html).toContain('NO-MIX');
    expect(html).toContain('No mixing');
    expect(html).toContain('Tuân thủ');
    expect(html).toContain('Chặn cứng');
  });

  it('renders a "no rule applied" state when winner is null', () => {
    const html = renderToStaticMarkup(<RulePreviewPanel preview={basePreview({ winner: null })} />);
    expect(html).toContain('Không có quy tắc nào áp dụng');
  });

  it('renders skipped rules with a HUMAN label for the reason enum (not the raw code)', () => {
    const html = renderToStaticMarkup(
      <RulePreviewPanel
        preview={basePreview({
          skippedRules: [
            {
              ruleCode: 'PREFER-A',
              ruleName: 'Prefer A',
              precedenceTier: 'OPTIMIZATION',
              controlMode: 'AUTO_SUGGESTION',
              reason: 'LOWER_TIER',
            },
          ],
        })}
      />,
    );
    expect(html).toContain('PREFER-A');
    expect(html).toContain('Tầng ưu tiên thấp hơn'); // labelled, not 'LOWER_TIER'
    expect(html).not.toContain('LOWER_TIER');
  });

  it('renders conflicts as DATA (tier + scope + rules + winner), and "no conflicts" when empty', () => {
    const withConflict = renderToStaticMarkup(
      <RulePreviewPanel
        preview={basePreview({
          conflicts: [
            {
              precedenceTier: 'PHYSICAL',
              scopeKey: 'DC|wh-1',
              winnerRuleCode: 'CAP-1',
              rules: [
                { ruleCode: 'CAP-1', ruleName: 'Cap 1', controlMode: 'HARD_BLOCK' },
                { ruleCode: 'CAP-2', ruleName: 'Cap 2', controlMode: 'SOFT_WARNING' },
              ],
            },
          ],
        })}
      />,
    );
    expect(withConflict).toContain('Vật lý');
    expect(withConflict).toContain('DC|wh-1');
    expect(withConflict).toContain('CAP-1');
    expect(withConflict).toContain('CAP-2');

    const noConflict = renderToStaticMarkup(<RulePreviewPanel preview={basePreview()} />);
    expect(noConflict).toContain('Không phát hiện xung đột.');
  });

  it('distinguishes a hard block control mode', () => {
    const html = renderToStaticMarkup(<RulePreviewPanel preview={basePreview()} />);
    expect(html).toContain('Chặn cứng');
  });

  it('distinguishes an approval-required control mode', () => {
    const html = renderToStaticMarkup(
      <RulePreviewPanel
        preview={basePreview({
          allowed: true,
          approvalRequired: true,
          controlMode: { mode: 'APPROVAL_REQUIRED', isHardBlock: false, approvalRequired: true, warning: null, suggestion: null },
        })}
      />,
    );
    expect(html).toContain('Yêu cầu phê duyệt');
  });

  it('distinguishes a soft-warning control mode and shows its message', () => {
    const html = renderToStaticMarkup(
      <RulePreviewPanel
        preview={basePreview({
          allowed: true,
          controlMode: {
            mode: 'SOFT_WARNING',
            isHardBlock: false,
            approvalRequired: false,
            warning: { message: 'Heads up: near capacity', ruleCode: 'WARN-1' },
            suggestion: null,
          },
        })}
      />,
    );
    expect(html).toContain('Cảnh báo mềm');
    expect(html).toContain('Heads up: near capacity');
  });

  it('distinguishes an auto-suggestion control mode and shows its message', () => {
    const html = renderToStaticMarkup(
      <RulePreviewPanel
        preview={basePreview({
          allowed: true,
          controlMode: {
            mode: 'AUTO_SUGGESTION',
            isHardBlock: false,
            approvalRequired: false,
            warning: null,
            suggestion: { message: 'Suggest zone B', ruleCode: 'SUG-1' },
          },
        })}
      />,
    );
    expect(html).toContain('Gợi ý tự động');
    expect(html).toContain('Suggest zone B');
  });

  it('renders reason readiness read-only flags', () => {
    const html = renderToStaticMarkup(<RulePreviewPanel preview={basePreview()} />);
    expect(html).toContain('Cần mã lý do');
    // read-only: no form controls in the panel.
    expect(html).not.toContain('<input');
    expect(html).not.toContain('<textarea');
  });

  it('renders a loading state when loading is true', () => {
    const html = renderToStaticMarkup(<RulePreviewPanel preview={null} loading />);
    expect(html).toContain('Đang chạy preview');
    expect(html).toContain('role="status"');
    expect(html).toContain('min-h-28');
    expect(html).toContain('py-10');
    expect(html).toContain('place-content-center');
  });

  it('renders an empty state when no preview has been run', () => {
    const html = renderToStaticMarkup(<RulePreviewPanel preview={null} />);
    expect(html).toContain('Chưa có preview');
    expect(html).toContain('role="status"');
    expect(html).toContain('min-h-28');
    expect(html).toContain('py-10');
    expect(html).toContain('place-content-center');
  });

  it('renders an error message when supplied', () => {
    const html = renderToStaticMarkup(<RulePreviewPanel preview={null} errorMessage="Preview không thành công" />);
    expect(html).toContain('Preview không thành công');
    expect(html).toContain('role="alert"');
    expect(html).toContain('min-h-28');
    expect(html).toContain('py-10');
    expect(html).toContain('place-content-center');
  });
});
