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
    await userEvent.selectOptions(screen.getByLabelText('Mã lý do'), 'RC-MD-UPDATE');
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

  it('uses Vietnamese helper copy for error states', () => {
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
    expect(screen.getByLabelText('Mã lý do').matches(':disabled')).toBe(true);
  });

  it('preserves a legacy selected value that is missing from fetched options', () => {
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

    const select = screen.getByLabelText('Mã lý do');
    expect((select as HTMLSelectElement).disabled).toBe(false);
    expect(screen.getByRole('option', { name: 'RC-LEGACY' })).toBeTruthy();
    expect((select as HTMLSelectElement).value).toBe('RC-LEGACY');
  });

});
