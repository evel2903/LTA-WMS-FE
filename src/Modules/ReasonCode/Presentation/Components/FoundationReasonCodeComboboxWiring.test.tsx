// @vitest-environment jsdom
import { cleanup, render } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { ApprovalDecisionForm } from '@modules/Approval/Presentation/Forms/ApprovalDecisionForm';
import { ExceptionActionForm } from '@modules/Compliance/Presentation/Forms/ExceptionActionForm';
import type { InventoryStatus } from '@modules/InventoryStatus/Domain/Entities/InventoryStatus';
import { InventoryStatusForm } from '@modules/InventoryStatus/Presentation/Forms/InventoryStatusForm';
import type { LocationProfile } from '@modules/MasterData/Domain/Types/MasterDataEntities';
import { LocationForm } from '@modules/MasterData/Presentation/Forms/LocationForm';
import { SiteForm } from '@modules/MasterData/Presentation/Forms/SiteForm';
import { WarehouseForm } from '@modules/MasterData/Presentation/Forms/WarehouseForm';

const reasonCodeSelect = vi.hoisted(() => ({
  props: [] as Array<Record<string, unknown>>,
}));

vi.mock('@modules/ReasonCode/Presentation/Components/ReasonCodeSelect', () => ({
  ReasonCodeSelect: (props: Record<string, unknown>) => {
    reasonCodeSelect.props.push(props);
    const id = typeof props.id === 'string' ? props.id : 'reason-code';
    const label = typeof props.label === 'string' ? props.label : 'Mã lý do';
    const value = typeof props.value === 'string' ? props.value : '';
    return (
      <select
        aria-label={label}
        data-testid={id}
        value={value}
        onChange={(event) => (props.onChange as (value: string) => void)(event.target.value)}
      >
        <option value="">Chọn mã lý do</option>
      </select>
    );
  },
}));

const noop = vi.fn();
const now = '2026-06-30T00:00:00.000Z';

const locationProfile: LocationProfile = {
  id: 'lp-1',
  profileCode: 'PICK-FACE',
  profileName: 'Pick face',
  locationType: 'PICK',
  version: 1,
  status: 'Active',
  capacityPolicy: {},
  eligibilityPolicy: {},
  mixPolicy: {},
  compliancePolicy: {},
  operationPolicy: {},
  sourceSystem: null,
  referenceId: null,
  createdAt: now,
  updatedAt: now,
  createdBy: null,
  updatedBy: null,
};

const inventoryStatus: InventoryStatus = {
  id: 'is-1',
  statusCode: 'AVAILABLE',
  displayName: 'Available',
  stageGroup: 'Storage',
  allowsAllocation: true,
  allowsPick: true,
  hold: false,
  isTerminal: false,
  isMilestone: false,
  sortOrder: 10,
  status: 'Active',
  sourceSystem: null,
  referenceId: null,
  updatedAt: now,
};

afterEach(() => cleanup());

beforeEach(() => {
  reasonCodeSelect.props = [];
  noop.mockClear();
});

describe('Foundation reason-code combobox wiring', () => {
  it('wires master-data forms with the expected Action + ObjectType filters', () => {
    render(
      <MemoryRouter>
        <SiteForm submitLabel="Lưu site" onSubmit={noop} />
        <WarehouseForm siteId="site-1" submitLabel="Lưu kho" onSubmit={noop} />
        <LocationForm
          warehouseId="wh-1"
          zoneId="zone-1"
          locationProfiles={[locationProfile]}
          submitLabel="Lưu vị trí"
          onSubmit={noop}
        />
      </MemoryRouter>,
    );

    expect(reasonCodeSelect.props).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: 'site-reason-code', action: 'Create', objectType: 'Site' }),
        expect.objectContaining({ id: 'warehouse-reason-code', action: 'Create', objectType: 'Warehouse' }),
        expect.objectContaining({ id: 'location-reason-code', action: 'Create', objectType: 'Location' }),
      ]),
    );
  });

  it('wires governance forms with the expected Action + ObjectType filters', () => {
    render(
      <>
        <InventoryStatusForm status={inventoryStatus} onSubmit={noop} />
        <ApprovalDecisionForm onApprove={noop} onReject={noop} />
        <ExceptionActionForm
          action="Submit"
          onLog={noop}
          onAssign={noop}
          onSubmit={noop}
          onResolve={noop}
          onClose={noop}
        />
        <ExceptionActionForm
          action="Resolve"
          onLog={noop}
          onAssign={noop}
          onSubmit={noop}
          onResolve={noop}
          onClose={noop}
        />
      </>,
    );

    expect(reasonCodeSelect.props).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: 'inventory-status-reason-code',
          action: 'Update',
          objectType: 'InventoryStatus',
        }),
        expect.objectContaining({
          id: 'approval-reason-code',
          action: 'Approve',
          objectType: 'ApprovalRequest',
        }),
        expect.objectContaining({
          id: 'exception-submit-reason-code',
          action: 'Approve',
          objectType: 'ExceptionCase',
        }),
        expect.objectContaining({
          id: 'exception-resolve-reason-code',
          action: 'Update',
          objectType: 'ExceptionCase',
        }),
      ]),
    );
  });
});
