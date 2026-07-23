// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';

const h = vi.hoisted(() => ({ useReasonCodeOptions: vi.fn() }));
vi.mock('@modules/ReasonCode/Application/Queries/UseReasonCodeOptions', () => ({
  useReasonCodeOptions: h.useReasonCodeOptions,
}));

import { ReasonCodeSelect } from '@modules/ReasonCode/Presentation/Components/ReasonCodeSelect';

describe('ReasonCodeSelect', () => {
  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it('loads ACTIVE reason codes by action and objectType, then returns the reasonCode string', async () => {
    h.useReasonCodeOptions.mockReturnValue({
      options: [
        { value: 'RC-MD-UPDATE', label: 'RC-MD-UPDATE — Cập nhật master data' },
        { value: 'RC-CANCEL', label: 'RC-CANCEL — Hủy bản ghi' },
      ],
      isLoading: false,
      isError: false,
    });
    const onChange = vi.fn();

    render(
      <ReasonCodeSelect
        id="reason-code"
        name="reasonCode"
        label="Mã lý do"
        value=""
        action="Update"
        objectType="Warehouse"
        onChange={onChange}
      />,
    );

    expect(h.useReasonCodeOptions).toHaveBeenCalledWith({
      action: 'Update',
      objectType: 'Warehouse',
    });
    await userEvent.click(screen.getByLabelText('Mã lý do'));
    await userEvent.click(screen.getByRole('option', { name: 'RC-MD-UPDATE — Cập nhật master data' }));
    expect(onChange).toHaveBeenCalledWith('RC-MD-UPDATE');
  });

  it('uses Vietnamese helper copy for empty states', () => {
    h.useReasonCodeOptions.mockReturnValue({ options: [], isLoading: false, isError: false });

    render(
      <ReasonCodeSelect
        id="reason-code"
        name="reasonCode"
        label="Mã lý do"
        value=""
        action="Create"
        objectType="Site"
        onChange={() => undefined}
      />,
    );

    expect(screen.getByText('Chưa có mã lý do phù hợp.')).toBeTruthy();
  });

  it('uses Vietnamese helper copy and keeps error states focusable but non-interactive', async () => {
    h.useReasonCodeOptions.mockReturnValue({ options: [], isLoading: false, isError: true });

    render(
      <ReasonCodeSelect
        id="reason-code"
        name="reasonCode"
        label="Mã lý do"
        value=""
        action="Create"
        objectType="Site"
        onChange={() => undefined}
      />,
    );

    expect(screen.getByText('Không tải được danh sách mã lý do.')).toBeTruthy();
    const trigger = screen.getByLabelText<HTMLButtonElement>('Mã lý do');
    expect(trigger.disabled).toBe(false);
    expect(trigger.getAttribute('aria-disabled')).toBe('true');
    await userEvent.click(trigger);
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('preserves a legacy selected value that is missing from fetched options', async () => {
    h.useReasonCodeOptions.mockReturnValue({ options: [], isLoading: false, isError: false });

    render(
      <ReasonCodeSelect
        id="reason-code"
        name="reasonCode"
        label="Mã lý do"
        value="RC-LEGACY"
        action="Update"
        objectType="Warehouse"
        onChange={() => undefined}
      />,
    );

    const trigger = screen.getByLabelText('Mã lý do');
    expect((trigger as HTMLButtonElement).disabled).toBe(false);
    expect(trigger.textContent).toBe('RC-LEGACY');
    await userEvent.click(trigger);
    expect(screen.getByRole('option', { name: 'RC-LEGACY' })).toBeTruthy();
  });

});
