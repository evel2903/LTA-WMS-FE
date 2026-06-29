// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { ReactElement } from 'react';

import { ApiError } from '@shared/Services/Http/ApiError';
import { ApprovalStateView } from '@modules/Approval/Presentation/Components/StateViews';
import { ApprovalDetailPanel } from '@modules/Approval/Presentation/Components/ApprovalDetailPanel';
import { ApprovalDecisionForm } from '@modules/Approval/Presentation/Forms/ApprovalDecisionForm';
import { blockedMessage as approvalBlockedMessage } from '@modules/Approval/Application/Commands/ApprovalMutationError';
import { ComplianceStateView } from '@modules/Compliance/Presentation/Components/StateViews';
import { ExceptionActionForm } from '@modules/Compliance/Presentation/Forms/ExceptionActionForm';
import { blockedMessage as complianceBlockedMessage } from '@modules/Compliance/Application/Commands/ComplianceMutationError';
import { ControlValidationCatalogStateView } from '@modules/ControlValidationCatalog/Presentation/Components/StateViews';
import { FoundationOverviewStateView, NoDataScopeWarning } from '@modules/FoundationOverview/Presentation/Components/StateViews';
import { InventoryStatusStateView } from '@modules/InventoryStatus/Presentation/Components/StateViews';
import { InventoryStatusForm } from '@modules/InventoryStatus/Presentation/Forms/InventoryStatusForm';
import { inlineMessage as inventoryStatusInlineMessage } from '@modules/InventoryStatus/Application/Commands/InventoryStatusMutationError';
import { OverrideLogStateView } from '@modules/OverrideLog/Presentation/Components/StateViews';
import { ReasonCodeStateView } from '@modules/ReasonCode/Presentation/Components/StateViews';
import { ReasonCodeForm } from '@modules/ReasonCode/Presentation/Forms/ReasonCodeForm';
import { conflictMessage as reasonCodeConflictMessage } from '@modules/ReasonCode/Application/Commands/ReasonCodeMutationError';
import type { ApprovalRequest } from '@modules/Approval/Domain/Entities/Approval';
import type { InventoryStatus } from '@modules/InventoryStatus/Domain/Entities/InventoryStatus';

type StateViewRender = (props: { state: 'denied' | 'error'; errorMessage?: string }) => ReactElement;

const stateViews: Array<{ name: string; render: StateViewRender }> = [
  { name: 'Approval', render: (props) => <ApprovalStateView {...props} /> },
  { name: 'Compliance', render: (props) => <ComplianceStateView {...props} /> },
  { name: 'OverrideLog', render: (props) => <OverrideLogStateView {...props} /> },
  { name: 'ReasonCode', render: (props) => <ReasonCodeStateView {...props} /> },
  { name: 'InventoryStatus', render: (props) => <InventoryStatusStateView {...props} /> },
  {
    name: 'ControlValidationCatalog',
    render: (props) => <ControlValidationCatalogStateView {...props} />,
  },
  { name: 'FoundationOverview', render: (props) => <FoundationOverviewStateView {...props} /> },
];

const noop = vi.fn();

function makeApprovalRequest(): ApprovalRequest {
  return {
    id: 'approval-1',
    requesterUserId: 'requester-1',
    action: 'Approve',
    targetObjectType: 'WarehouseProfile',
    targetObjectId: 'wp-1',
    targetObjectCode: 'WP-MAIN',
    scope: null,
    requestReasonCodeId: null,
    requestReasonNote: null,
    evidenceRefs: null,
    decision: 'PENDING',
    decidedByUserId: null,
    decisionReasonCodeId: null,
    decisionNote: null,
    decidedAt: null,
    referenceType: null,
    referenceId: null,
    createdAt: '2026-06-29T00:00:00.000Z',
    updatedAt: '2026-06-29T00:00:00.000Z',
  };
}

function makeInventoryStatus(): InventoryStatus {
  return {
    id: 'status-1',
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
    updatedAt: null,
  };
}

afterEach(() => {
  cleanup();
  noop.mockClear();
});

describe('Foundation ReUI role semantics guardrail', () => {
  it.each(stateViews)('$name state view renders denied as status and error as alert', ({ render: renderState }) => {
    render(renderState({ state: 'denied' }));
    expect(screen.getByRole('status').textContent).toContain('Không có quyền');

    cleanup();

    render(renderState({ state: 'error', errorMessage: 'Lỗi kiểm thử' }));
    expect(screen.getByRole('alert').textContent).toContain('Lỗi kiểm thử');
  });

  it('renders warning helper and mutation-blocking approval self-rule with the expected roles', () => {
    render(<NoDataScopeWarning message="Thiếu phạm vi dữ liệu" />);
    expect(screen.getByRole('status').textContent).toContain('Thiếu phạm vi dữ liệu');

    cleanup();

    render(
      <ApprovalDetailPanel
        request={makeApprovalRequest()}
        canManage
        isSelfRequester
        pending={false}
        onApprove={noop}
        onReject={noop}
      />,
    );
    expect(screen.getByRole('alert').textContent).toContain('Không thể tự duyệt yêu cầu');
  });

  it('renders form-level blocked/conflict messages as destructive alerts', () => {
    render(
      <ApprovalDecisionForm
        blocked="Yêu cầu đã được quyết định"
        onApprove={noop}
        onReject={noop}
      />,
    );
    expect(screen.getByRole('alert').textContent).toContain('Yêu cầu đã được quyết định');

    cleanup();

    render(
      <ExceptionActionForm
        action="Resolve"
        blocked="Cần bằng chứng để xử lý loại ngoại lệ này"
        onLog={noop}
        onAssign={noop}
        onSubmit={noop}
        onResolve={noop}
        onClose={noop}
      />,
    );
    expect(screen.getByRole('alert').textContent).toContain('Cần bằng chứng');

    cleanup();

    render(
      <ReasonCodeForm
        mode="create"
        conflict="Mã lý do đã tồn tại: RC-DUP"
        onSubmit={noop}
      />,
    );
    expect(screen.getByRole('alert').textContent).toContain('Mã lý do đã tồn tại');

    cleanup();

    render(
      <InventoryStatusForm
        status={makeInventoryStatus()}
        inlineError="Cần mã lý do cho thay đổi này."
        onSubmit={noop}
      />,
    );
    expect(screen.getByRole('alert').textContent).toContain('Cần mã lý do');
  });

  it('localizes known backend mutation errors before presenting them inline', () => {
    expect(
      approvalBlockedMessage(
        new ApiError({ status: 400, code: 'BUSINESS_RULE', message: 'Request already decided' }),
      ),
    ).toBe('Yêu cầu đã được quyết định');
    expect(
      complianceBlockedMessage(
        new ApiError({
          status: 400,
          code: 'BUSINESS_RULE',
          message: 'Resolve requires evidence for this exception type',
        }),
      ),
    ).toBe('Cần bằng chứng để xử lý loại ngoại lệ này');
    expect(
      reasonCodeConflictMessage(
        new ApiError({ status: 409, code: 'CONFLICT', message: 'Reason code already exists: RC-DUP' }),
      ),
    ).toBe('Mã lý do đã tồn tại: RC-DUP');
    expect(
      inventoryStatusInlineMessage(
        new ApiError({
          status: 400,
          code: 'BUSINESS_RULE',
          message: 'Reason code is required for this change.',
        }),
      ),
    ).toBe('Cần mã lý do cho thay đổi này.');
  });
});
