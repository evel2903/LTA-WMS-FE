import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import { ROUTES } from '@app/Config/Routes';
import { warehouseProfileRoutes } from '@modules/WarehouseProfile/Presentation/Routes/WarehouseProfileRoutes';
import { ControlModeBadge } from '@modules/WarehouseProfile/Presentation/Components/ControlModeBadge';
import { WarehouseProfileStatusBadge } from '@modules/WarehouseProfile/Presentation/Components/WarehouseProfileStatusBadge';
import { ProfileStateView } from '@modules/WarehouseProfile/Presentation/Components/StateViews';
import { ProfileLifecycleActions } from '@modules/WarehouseProfile/Presentation/Components/ProfileLifecycleActions';

describe('WarehouseProfileStatusBadge', () => {
  it('renders each lifecycle status label', () => {
    expect(renderToStaticMarkup(<WarehouseProfileStatusBadge status="DRAFT" />)).toContain('Draft');
    expect(renderToStaticMarkup(<WarehouseProfileStatusBadge status="ACTIVE" />)).toContain('Active');
    expect(renderToStaticMarkup(<WarehouseProfileStatusBadge status="EXPIRED" />)).toContain('Expired');
    expect(renderToStaticMarkup(<WarehouseProfileStatusBadge status="RETIRED" />)).toContain('Retired');
  });
});

describe('ControlModeBadge', () => {
  it('renders a distinct label for each of the four control modes', () => {
    expect(renderToStaticMarkup(<ControlModeBadge mode="HARD_BLOCK" />)).toContain('Hard block');
    expect(renderToStaticMarkup(<ControlModeBadge mode="APPROVAL_REQUIRED" />)).toContain('Approval required');
    expect(renderToStaticMarkup(<ControlModeBadge mode="SOFT_WARNING" />)).toContain('Soft warning');
    expect(renderToStaticMarkup(<ControlModeBadge mode="AUTO_SUGGESTION" />)).toContain('Auto suggestion');
  });
});

describe('ProfileStateView (AC5 states)', () => {
  it('renders loading / empty / denied states distinctly', () => {
    expect(renderToStaticMarkup(<ProfileStateView state="loading" />)).toContain('Loading');
    expect(renderToStaticMarkup(<ProfileStateView state="empty" emptyLabel="No profiles yet." />)).toContain(
      'No profiles yet.',
    );
    expect(renderToStaticMarkup(<ProfileStateView state="denied" />)).toContain('Permission denied');
  });

  it('renders an error message in the error state', () => {
    expect(renderToStaticMarkup(<ProfileStateView state="error" errorMessage="Backend down" />)).toContain(
      'Backend down',
    );
  });
});

describe('ProfileLifecycleActions (AC2 + AC5 conflict / denied)', () => {
  it('renders activate + deactivate actions for a draft profile', () => {
    const html = renderToStaticMarkup(
      <ProfileLifecycleActions status="DRAFT" onActivate={() => undefined} onDeactivate={() => undefined} />,
    );
    expect(html).toContain('Activate');
    expect(html).toContain('Deactivate');
  });

  it('renders the conflict list as a distinct state when a 409 conflict message is supplied', () => {
    const html = renderToStaticMarkup(
      <ProfileLifecycleActions
        status="DRAFT"
        conflictMessage="Overlapping active profile for this scope."
        onActivate={() => undefined}
        onDeactivate={() => undefined}
      />,
    );
    expect(html).toContain('Conflict');
    expect(html).toContain('Overlapping active profile for this scope.');
  });

  it('disables the actions and shows a read-only label when not permitted', () => {
    const html = renderToStaticMarkup(
      <ProfileLifecycleActions
        status="DRAFT"
        canManage={false}
        onActivate={() => undefined}
        onDeactivate={() => undefined}
      />,
    );
    expect(html).toContain('disabled');
    expect(html.toLowerCase()).toContain('read only');
  });
});

describe('warehouse profile routes', () => {
  it('registers list/detail and rule screen routes under the foundation namespace', () => {
    expect(ROUTES.FOUNDATION.WAREHOUSE_PROFILES).toBe('/foundation/warehouse-profiles');
    expect(ROUTES.FOUNDATION.RULE_MATRIX).toBe('/foundation/rule-matrix');
    expect(warehouseProfileRoutes).toHaveLength(6);
    expect(warehouseProfileRoutes.map((route) => route.path)).toEqual([
      ROUTES.FOUNDATION.WAREHOUSE_PROFILES,
      ROUTES.FOUNDATION.WAREHOUSE_PROFILE_NEW,
      ROUTES.FOUNDATION.WAREHOUSE_PROFILE_DETAIL(),
      ROUTES.FOUNDATION.WAREHOUSE_PROFILE_EDIT(),
      ROUTES.FOUNDATION.RULE_MATRIX,
      ROUTES.FOUNDATION.RULE_MATRIX_PREVIEW,
    ]);
  });
});
