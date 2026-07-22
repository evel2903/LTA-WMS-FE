// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { ComboboxSelect } from '@shared/Components/Ui/ComboboxSelect';

const OPTIONS = [
  { value: 'sku-1', label: 'SKU-1 - Sản phẩm 1' },
  { value: 'sku-2', label: 'SKU-2 - Sản phẩm 2' },
];

function renderCombobox(overrides: Partial<Parameters<typeof ComboboxSelect>[0]> = {}) {
  const onChange = vi.fn();
  const result = render(
    <ComboboxSelect
      id="catalog-sku"
      name="skuId"
      label="SKU"
      value=""
      placeholder="Chọn SKU"
      options={OPTIONS}
      emptyMessage="Chưa có SKU."
      errorMessage="Không tải được SKU."
      onChange={onChange}
      {...overrides}
    />,
  );
  return { ...result, onChange, trigger: screen.getByRole<HTMLButtonElement>('combobox', { name: 'SKU' }) };
}

const originalScrollIntoViewDescriptor = Object.getOwnPropertyDescriptor(
  HTMLElement.prototype,
  'scrollIntoView',
);

afterEach(() => {
  cleanup();
  if (originalScrollIntoViewDescriptor) {
    Object.defineProperty(
      HTMLElement.prototype,
      'scrollIntoView',
      originalScrollIntoViewDescriptor,
    );
  } else {
    delete (HTMLElement.prototype as Partial<HTMLElement>).scrollIntoView;
  }
});

describe('ComboboxSelect', () => {
  it('exposes required semantics unless the field is explicitly optional', () => {
    const { trigger, rerender } = renderCombobox();
    expect(trigger.getAttribute('aria-required')).toBe('true');

    rerender(
      <ComboboxSelect
        id="catalog-sku"
        name="skuId"
        label="SKU"
        value=""
        placeholder="Chọn SKU"
        options={OPTIONS}
        optional
        onChange={vi.fn()}
      />,
    );
    expect(screen.getByRole('combobox', { name: 'SKU' }).hasAttribute('aria-required')).toBe(false);
  });

  it('preserves a selected legacy value that is absent from the fetched catalog', () => {
    const { trigger } = renderCombobox({ value: 'legacy-sku', options: [] });

    expect(trigger.disabled).toBe(false);
    expect(trigger.textContent).toContain('legacy-sku');
    expect(screen.queryByText('Chưa có SKU.')).toBeNull();
  });

  it.each([
    [{ isLoading: true, options: [] }, 'Đang tải danh sách...'],
    [{ isError: true, options: [] }, 'Không tải được SKU.'],
    [{ options: [] }, 'Chưa có SKU.'],
  ])('keeps the %s state visible and non-interactive', (overrides, helperText) => {
    const { trigger } = renderCombobox(overrides);

    expect(trigger.disabled).toBe(true);
    expect(screen.getByText(helperText)).toBeTruthy();
  });

  it('recovers keyboard highlight when async options arrive after an empty result', async () => {
    const actor = userEvent.setup();
    const onChange = vi.fn();
    const props = {
      id: 'catalog-sku',
      name: 'skuId',
      label: 'SKU',
      value: '',
      placeholder: 'Chọn SKU',
      emptyMessage: 'Chưa có SKU.',
      errorMessage: 'Không tải được SKU.',
      onChange,
    };
    const { rerender } = render(<ComboboxSelect {...props} options={OPTIONS} />);

    await actor.click(screen.getByRole('combobox', { name: 'SKU' }));
    const search = screen.getByRole('textbox', { name: 'Tìm kiếm SKU' });
    rerender(<ComboboxSelect {...props} options={[]} />);
    fireEvent.keyDown(search, { key: 'ArrowDown' });
    rerender(<ComboboxSelect {...props} options={[{ value: 'sku-new', label: 'SKU mới' }]} />);

    await waitFor(() =>
      expect(search.getAttribute('aria-activedescendant')).toBe('catalog-sku-option-sku-new'),
    );
    fireEvent.keyDown(search, { key: 'Enter' });
    expect(onChange).toHaveBeenCalledWith('sku-new');
  });

  it('scrolls the keyboard-highlighted option into view', async () => {
    const actor = userEvent.setup();
    const scrollIntoView = vi.fn();
    Object.defineProperty(HTMLElement.prototype, 'scrollIntoView', {
      configurable: true,
      value: scrollIntoView,
    });
    renderCombobox();

    await actor.click(screen.getByRole('combobox', { name: 'SKU' }));
    scrollIntoView.mockClear();
    fireEvent.keyDown(screen.getByRole('textbox', { name: 'Tìm kiếm SKU' }), { key: 'ArrowDown' });

    await waitFor(() => expect(scrollIntoView).toHaveBeenCalledWith({ block: 'nearest' }));
  });

  it('wraps long option labels in the opened list for touch users', async () => {
    const actor = userEvent.setup();
    const longLabel = 'SKU-SER-1783928953781 - Serial Only Test 1783928953781';
    renderCombobox({ options: [{ value: 'sku-long', label: longLabel }] });

    await actor.click(screen.getByRole('combobox', { name: 'SKU' }));
    const option = screen.getByRole('option', { name: longLabel });
    const label = option.querySelector('span');
    expect(label?.className).toContain('break-words');
    expect(label?.className).not.toContain('truncate');
  });
});
