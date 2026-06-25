// @vitest-environment jsdom

import { cleanup, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, it } from 'vitest';

import {
  ActionPanel,
  type ActionPanelState,
  DetailPageShell,
  type GovernanceState,
  GovernanceStateBanner,
  ListPageShell,
  type PageBoundaryState,
  PageStateBoundary,
} from '@shared/Components/Page';

afterEach(() => cleanup());

describe('Page shell components', () => {
  it('renders list page header, filters, content and pagination slots', () => {
    render(
      <ListPageShell
        title="Partners"
        description="Supplier, customer and carrier catalog"
        toolbar={<button type="button">Create partner</button>}
        filters={<label htmlFor="q">Search</label>}
        pagination={<button type="button">Next page</button>}
      >
        <table>
          <tbody>
            <tr>
              <td>ACME Supplier</td>
            </tr>
          </tbody>
        </table>
      </ListPageShell>,
    );

    expect(screen.getByRole('heading', { name: 'Partners' })).toBeTruthy();
    expect(screen.getByText('Supplier, customer and carrier catalog')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Create partner' })).toBeTruthy();
    expect(screen.getByRole('region', { name: 'Partners filters' })).toBeTruthy();
    expect(screen.getByText('ACME Supplier')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Next page' })).toBeTruthy();
  });

  it('renders detail page back link, status, summary and actions', () => {
    render(
      <MemoryRouter>
        <DetailPageShell
          title="Partner P-001"
          subtitle="Supplier profile"
          backTo="/foundation/master-data/partners"
          backLabel="Back to partners"
          status={<span>Active</span>}
          summary={<span>External ref EXT-001</span>}
          actions={<button type="button">Approve</button>}
        >
          <section>Partner details</section>
        </DetailPageShell>
      </MemoryRouter>,
    );

    const backLink = screen.getByRole('link', { name: 'Back to partners' });
    expect(backLink.getAttribute('href')).toBe('/foundation/master-data/partners');
    expect(screen.getByRole('heading', { name: 'Partner P-001' })).toBeTruthy();
    expect(screen.getByText('Active')).toBeTruthy();
    expect(screen.getByText('External ref EXT-001')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Approve' })).toBeTruthy();
    expect(screen.getByText('Partner details')).toBeTruthy();
  });

  it.each<GovernanceState>([
    'denied',
    'readOnly',
    'blocked',
    'approvalRequired',
    'overrideRequired',
    'warning',
    'missingSetup',
    'ready',
  ])('renders governance state %s without embedding mutation behavior', (state) => {
    render(
      <GovernanceStateBanner
        state={state}
        title={`Governance ${state}`}
        message="Missing permission decision."
        action={<button type="button">Request access</button>}
      />,
    );

    expect(screen.getByText(`Governance ${state}`)).toBeTruthy();
    expect(screen.getByText('Missing permission decision.')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Request access' })).toBeTruthy();
  });

  it.each<PageBoundaryState>(['loading', 'empty', 'error', 'forbidden', 'notFound', 'blocked'])(
    'renders blocking page boundary state %s without content',
    (state) => {
      render(
        <PageStateBoundary state={state} title={`Boundary ${state}`} message="State message.">
          Hidden content
        </PageStateBoundary>,
      );

      expect(screen.getByText(`Boundary ${state}`)).toBeTruthy();
      expect(screen.getByText('State message.')).toBeTruthy();
      expect(screen.queryByText('Hidden content')).toBeNull();
    },
  );

  it('renders read-only page boundary with content visible', () => {
    render(
      <PageStateBoundary state="readOnly" title="Ranh giới chỉ đọc" message="Các thao tác đã bị tắt.">
        Visible read-only content
      </PageStateBoundary>,
    );

    expect(screen.getByRole('status')).toBeTruthy();
    expect(screen.getByText('Ranh giới chỉ đọc')).toBeTruthy();
    expect(screen.getByText('Visible read-only content')).toBeTruthy();
  });

  it('passes through page boundary content when no state is active', () => {
    const { rerender } = render(
      <PageStateBoundary state="empty" title="No partners" message="Create the first partner.">
        Hidden content
      </PageStateBoundary>,
    );

    expect(screen.getByRole('status')).toBeTruthy();
    expect(screen.getByText('No partners')).toBeTruthy();
    expect(screen.queryByText('Hidden content')).toBeNull();

    rerender(<PageStateBoundary>Visible content</PageStateBoundary>);

    expect(screen.getByText('Visible content')).toBeTruthy();
  });

  it.each<ActionPanelState>(['pending', 'error', 'success', 'disabled'])(
    'renders action panel state %s',
    (state) => {
      render(
        <ActionPanel
          title="Panel state"
          state={state}
          stateTitle={`Action ${state}`}
          stateMessage="Action state message."
          footer={<button type="button">Submit</button>}
        />,
      );

      expect(screen.getByText(`Action ${state}`)).toBeTruthy();
      expect(screen.getByText('Action state message.')).toBeTruthy();
      if (state === 'pending' || state === 'disabled') {
        expect(screen.getByRole('group').hasAttribute('disabled')).toBe(true);
      }
    },
  );

  it('renders action panel governance banner and footer controls', () => {
    render(
      <ActionPanel
        title="Approve partner"
        description="Kiểm tra lý do kiểm toán trước khi phê duyệt."
        state="pending"
        stateTitle="Đang gửi"
        stateMessage="Yêu cầu phê duyệt đang được gửi."
        governanceState="approvalRequired"
        footer={<button type="button">Submit approval</button>}
      >
        <label htmlFor="reason">Reason</label>
      </ActionPanel>,
    );

    expect(screen.getByRole('heading', { name: 'Approve partner' })).toBeTruthy();
    expect(screen.getByText('Kiểm tra lý do kiểm toán trước khi phê duyệt.')).toBeTruthy();
    expect(screen.getByText('Đang gửi')).toBeTruthy();
    expect(screen.getByText('Yêu cầu phê duyệt đang được gửi.')).toBeTruthy();
    expect(screen.getByText('Cần phê duyệt')).toBeTruthy();
    expect(screen.getByText('Reason')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Submit approval' })).toBeTruthy();
  });

  it('renders action panel disabled and error states', () => {
    const { rerender } = render(
      <ActionPanel
        title="Cancel receipt"
        state="disabled"
        stateMessage="Phiếu nhận hàng đã đóng."
        footer={<button type="button">Confirm cancel</button>}
      />,
    );

    expect(screen.getByText('Thao tác bị tắt')).toBeTruthy();
    expect(screen.getByText('Phiếu nhận hàng đã đóng.')).toBeTruthy();
    expect(screen.getByRole('group').hasAttribute('disabled')).toBe(true);

    rerender(
      <ActionPanel title="Hủy phiếu nhận hàng" state="error" stateMessage="Cần lý do kiểm toán." />,
    );

    expect(screen.getByRole('alert')).toBeTruthy();
    expect(screen.getByText('Thao tác thất bại')).toBeTruthy();
    expect(screen.getByText('Cần lý do kiểm toán.')).toBeTruthy();
  });

  it('keeps read-only detail content visible while hiding action slots', () => {
    render(
      <MemoryRouter>
        <DetailPageShell
          title="Closed receipt"
          state="readOnly"
          actions={<button type="button">Edit receipt</button>}
        >
          <section>Receipt details stay visible.</section>
        </DetailPageShell>
      </MemoryRouter>,
    );

    expect(screen.getByText('Chế độ chỉ đọc')).toBeTruthy();
    expect(screen.getByText('Receipt details stay visible.')).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Edit receipt' })).toBeNull();
  });

  it('hides list controls when a blocking page state is active', () => {
    render(
      <ListPageShell
        title="Inbound"
        state="forbidden"
        toolbar={<button type="button">Create inbound</button>}
        filters={<label htmlFor="search-inbound">Search inbound</label>}
        pagination={<button type="button">Next</button>}
      >
        Inbound rows
      </ListPageShell>,
    );

    expect(screen.getByText('Cần quyền truy cập')).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Create inbound' })).toBeNull();
    expect(screen.queryByText('Search inbound')).toBeNull();
    expect(screen.queryByRole('button', { name: 'Next' })).toBeNull();
    expect(screen.queryByText('Inbound rows')).toBeNull();
  });
});
