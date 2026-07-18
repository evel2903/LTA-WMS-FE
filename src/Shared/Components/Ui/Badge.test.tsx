import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import { InboundLineStageChip } from '@modules/InboundReceiving/Presentation/Components/InboundLineStageChip';
import { FoundationStatusBadge } from '@modules/FoundationOverview/Presentation/Components/FoundationStatusBadge';
import { StockStatusBadge } from '@modules/Inventory/Presentation/Components/StockStatusBadge';
import { STOCK_STATUS_LABELS } from '@modules/Inventory/Domain/Constants/InventoryConstants';
import { Badge as ReuiBadge } from '@shared/Components/Reui/badge';
import { Badge, badgeVariants } from '@shared/Components/Ui/Badge';

describe('Badge primitive ReUI compatibility', () => {
  it('keeps the Ui/Badge import backed by the ReUI badge output', () => {
    const legacyHtml = renderToStaticMarkup(<Badge variant="success">Ready</Badge>);
    const reuiHtml = renderToStaticMarkup(<ReuiBadge variant="success">Ready</ReuiBadge>);

    expect(legacyHtml).toBe(reuiHtml);
    expect(legacyHtml).toContain('data-slot="badge"');
    expect(legacyHtml).toContain('bg-success');
  });

  it('maps every legacy variant to the shared ReUI variant source', () => {
    expect(badgeVariants({ variant: 'default' })).toContain('bg-primary');
    expect(badgeVariants({ variant: 'secondary' })).toContain('bg-secondary');
    expect(badgeVariants({ variant: 'destructive' })).toContain('bg-destructive');
    expect(badgeVariants({ variant: 'outline' })).toContain('border-border');
    expect(badgeVariants({ variant: 'success' })).toContain('bg-success');
    expect(badgeVariants({ variant: 'warning' })).toContain('bg-warning');
  });

  it('keeps the inbound ReUI pilot stage chip render stable', () => {
    const html = renderToStaticMarkup(
      <InboundLineStageChip lineId="line-1" stage="released" />,
    );

    expect(html).toContain('data-testid="inbound-line-stage-chip-line-1"');
    expect(html).toContain('Đã release');
    expect(html).toContain('bg-success/10');
  });

  it('renders a foundation representative badge through the unified primitive', () => {
    const html = renderToStaticMarkup(<FoundationStatusBadge status="ready" />);

    expect(html).toContain('Sẵn sàng');
    expect(html).toContain('data-slot="badge"');
    expect(html).toContain('bg-success');
  });

  it('renders a non-foundation representative badge through the unified primitive', () => {
    const html = renderToStaticMarkup(<StockStatusBadge status="LOW_STOCK" />);

    expect(html).toContain(STOCK_STATUS_LABELS.LOW_STOCK);
    expect(html).toContain('data-slot="badge"');
    expect(html).toContain('bg-warning');
  });
});
