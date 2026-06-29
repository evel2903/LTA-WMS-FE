// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { LookupSelect } from '@shared/Components/Ui/LookupSelect';

const OPTIONS = [
  { value: 'RC-A', label: 'RC-A — Lý do A' },
  { value: 'RC-B', label: 'RC-B — Lý do B' },
];

function renderSelect(overrides: Partial<Parameters<typeof LookupSelect>[0]> = {}) {
  const onChange = vi.fn();
  render(
    <LookupSelect
      id="lk"
      name="lk"
      label="Mã lý do"
      value=""
      placeholder="Chọn mã lý do"
      options={OPTIONS}
      isLoading={false}
      isError={false}
      emptyMessage="Chưa có mã."
      errorMessage="Lỗi tải."
      onChange={onChange}
      {...overrides}
    />,
  );
  return { onChange, select: screen.getByRole<HTMLSelectElement>('combobox') };
}

describe('LookupSelect', () => {
  afterEach(() => cleanup());

  it('renders options from the catalog plus the placeholder', () => {
    const { select } = renderSelect();
    const values = Array.from(select.options).map((option) => option.value);
    expect(values).toEqual(['', 'RC-A', 'RC-B']);
  });

  it('emits the selected option value via onChange', async () => {
    const actor = userEvent.setup();
    const { onChange, select } = renderSelect();
    await actor.selectOptions(select, 'RC-B');
    expect(onChange).toHaveBeenCalledWith('RC-B');
  });

  it('keeps a current value that is not in the fetched list selectable', () => {
    const { select } = renderSelect({ value: 'RC-LEGACY' });
    const values = Array.from(select.options).map((option) => option.value);
    expect(values).toContain('RC-LEGACY');
    expect(select.value).toBe('RC-LEGACY');
  });

  it('keeps a legacy value usable when the catalog is empty (no false disable/empty helper)', () => {
    const { select } = renderSelect({ value: 'RC-LEGACY', options: [] });
    expect(select.value).toBe('RC-LEGACY');
    expect(select.disabled).toBe(false);
    expect(screen.queryByText('Chưa có mã.')).toBeNull();
  });

  it('honours the external disabled flag even when options are loaded', () => {
    const { select } = renderSelect({ disabled: true });
    expect(select.disabled).toBe(true);
  });

  it('shows the loading helper and disables while loading', () => {
    const { select } = renderSelect({ isLoading: true, options: [] });
    expect(select.disabled).toBe(true);
    expect(screen.getByText('Đang tải danh sách...')).toBeTruthy();
  });

  it('shows the empty helper when no options and no current value', () => {
    renderSelect({ options: [] });
    expect(screen.getByText('Chưa có mã.')).toBeTruthy();
  });

  it('shows the error helper on error', () => {
    renderSelect({ isError: true, options: [] });
    expect(screen.getByText('Lỗi tải.')).toBeTruthy();
  });
});
