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
  return {
    ...result,
    onChange,
    trigger: screen.getByRole<HTMLButtonElement>('combobox', { name: 'SKU' }),
  };
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

  it('keeps the selected label after controlled search options reset', () => {
    const remoteOption = {
      value: 'sku-remote',
      label: 'SKU-REMOTE - Sản phẩm ngoài trang mặc định',
    };
    const { rerender, onChange } = renderCombobox({
      options: [remoteOption],
      searchValue: 'remote',
      onSearchChange: vi.fn(),
    });

    fireEvent.click(screen.getByRole('combobox', { name: 'SKU' }));
    fireEvent.click(screen.getByRole('option', { name: remoteOption.label }));
    expect(onChange).toHaveBeenCalledWith(remoteOption.value);

    rerender(
      <ComboboxSelect
        id="catalog-sku"
        name="skuId"
        label="SKU"
        value={remoteOption.value}
        placeholder="Chọn SKU"
        options={[]}
        searchValue=""
        onSearchChange={vi.fn()}
        onChange={vi.fn()}
      />,
    );
    expect(screen.getByRole('combobox', { name: 'SKU' }).textContent).toContain(remoteOption.label);
  });

  it('does not prepend the selected option ahead of active controlled-search results', async () => {
    const actor = userEvent.setup();
    const onChange = vi.fn();
    const remoteOption = { value: 'sku-remote', label: 'SKU-REMOTE - Kết quả tìm kiếm' };
    const props = {
      id: 'catalog-sku',
      name: 'skuId',
      label: 'SKU',
      value: 'sku-1',
      placeholder: 'Chọn SKU',
      onChange,
      onSearchChange: vi.fn(),
    };
    const { rerender } = render(<ComboboxSelect {...props} options={OPTIONS} searchValue="" />);

    await actor.click(screen.getByRole('combobox', { name: 'SKU' }));
    rerender(<ComboboxSelect {...props} options={[remoteOption]} searchValue="remote" />);
    expect(screen.queryByRole('option', { name: OPTIONS[0].label })).toBeNull();
    fireEvent.keyDown(screen.getByRole('combobox', { name: 'Tìm kiếm SKU' }), {
      key: 'Enter',
    });
    expect(onChange).toHaveBeenCalledWith(remoteOption.value);
  });

  it('does not commit stale options before a controlled-search response catches up', async () => {
    const actor = userEvent.setup();
    const { onChange, trigger } = renderCombobox({
      searchValue: 'remote',
      onSearchChange: vi.fn(),
    });

    await actor.click(trigger);

    expect(screen.queryByRole('option', { name: OPTIONS[0].label })).toBeNull();
    fireEvent.keyDown(screen.getByRole('combobox', { name: 'Tìm kiếm SKU' }), {
      key: 'Enter',
    });
    expect(onChange).not.toHaveBeenCalled();
  });

  it('keeps accent-folded server results visible to the local stale-option guard', async () => {
    const actor = userEvent.setup();
    const ownerOption = { value: 'owner-1', label: 'OWN-1 - Chủ hàng Việt Nam' };
    const { trigger } = renderCombobox({
      options: [ownerOption],
      searchValue: 'chu hang',
      onSearchChange: vi.fn(),
    });

    await actor.click(trigger);

    expect(screen.getByRole('option', { name: ownerOption.label })).toBeTruthy();
  });

  it('does not commit a highlighted option while an IME composition is finishing', async () => {
    const actor = userEvent.setup();
    const { onChange, trigger } = renderCombobox();

    await actor.click(trigger);
    fireEvent.keyDown(screen.getByRole('combobox', { name: 'Tìm kiếm SKU' }), {
      key: 'Enter',
      isComposing: true,
    });

    expect(onChange).not.toHaveBeenCalled();
  });

  it('contains Escape while an IME composition is active', async () => {
    const actor = userEvent.setup();
    const windowKeyDown = vi.fn();
    window.addEventListener('keydown', windowKeyDown);
    const { trigger } = renderCombobox();

    await actor.click(trigger);
    fireEvent.keyDown(screen.getByRole('combobox', { name: 'Tìm kiếm SKU' }), {
      key: 'Escape',
      isComposing: true,
    });
    window.removeEventListener('keydown', windowKeyDown);

    expect(windowKeyDown).not.toHaveBeenCalled();
    expect(screen.getByRole('combobox', { name: 'Tìm kiếm SKU' })).toBeTruthy();
  });

  it.each([{ isLoading: true }, { isError: true }, { disabled: true }])(
    'does not commit stale options when an open combobox enters %s',
    async (catalogState) => {
      const actor = userEvent.setup();
      const { onChange, rerender, trigger } = renderCombobox();

      await actor.click(trigger);
      rerender(
        <ComboboxSelect
          id="catalog-sku"
          name="skuId"
          label="SKU"
          value=""
          placeholder="Chọn SKU"
          options={OPTIONS}
          onChange={onChange}
          {...catalogState}
        />,
      );

      expect(screen.queryByRole('option', { name: OPTIONS[0].label })).toBeNull();
      const searchInput = screen.queryByRole('combobox', { name: 'Tìm kiếm SKU' });
      if (searchInput) fireEvent.keyDown(searchInput, { key: 'Enter' });
      expect(onChange).not.toHaveBeenCalled();
    },
  );

  it.each([{ isLoading: true }, { isError: true }])(
    'keeps focus on the trigger when an open combobox enters transient catalog state %s',
    async (catalogState) => {
      const actor = userEvent.setup();
      const { rerender, trigger } = renderCombobox();

      await actor.click(trigger);
      const searchInput = screen.getByRole('combobox');
      rerender(
        <ComboboxSelect
          id="catalog-sku"
          name="skuId"
          label="SKU"
          value=""
          placeholder="Chọn SKU"
          options={OPTIONS}
          onChange={vi.fn()}
          {...catalogState}
        />,
      );

      expect(trigger.disabled).toBe(false);
      expect(trigger.getAttribute('aria-disabled')).toBe('true');
      fireEvent.keyDown(searchInput, { key: 'Escape' });
      await waitFor(() => expect(trigger).toBe(document.activeElement));

      await actor.click(trigger);
      expect(screen.queryByRole('dialog')).toBeNull();
    },
  );

  it('bounds observed-option labels while preserving the current selected label', () => {
    const manyOptions = Array.from({ length: 205 }, (_, index) => ({
      value: `sku-${index}`,
      label: `SKU-${index} - Sản phẩm ${index}`,
    }));
    const { rerender } = renderCombobox({ value: manyOptions[0].value, options: manyOptions });

    rerender(
      <ComboboxSelect
        id="catalog-sku"
        name="skuId"
        label="SKU"
        value={manyOptions[0].value}
        placeholder="Chọn SKU"
        options={[]}
        onChange={vi.fn()}
      />,
    );
    expect(screen.getByRole('combobox', { name: 'SKU' }).textContent).toContain(
      manyOptions[0].label,
    );

    rerender(
      <ComboboxSelect
        id="catalog-sku"
        name="skuId"
        label="SKU"
        value={manyOptions[1].value}
        placeholder="Chọn SKU"
        options={[]}
        onChange={vi.fn()}
      />,
    );
    expect(screen.getByRole('combobox', { name: 'SKU' }).textContent).toContain(
      manyOptions[1].value,
    );
    expect(screen.getByRole('combobox', { name: 'SKU' }).textContent).not.toContain(
      manyOptions[1].label,
    );
  });

  it.each([{ isLoading: true }, { isError: true }])(
    'allows an optional selected value to be cleared during catalog state %s',
    async (catalogState) => {
      const actor = userEvent.setup();
      const onSearchChange = vi.fn();
      const { onChange, trigger } = renderCombobox({
        value: 'sku-1',
        optional: true,
        searchValue: 'failed query',
        onSearchChange,
        ...catalogState,
      });

      expect(trigger.disabled).toBe(false);
      expect(trigger.getAttribute('aria-disabled')).toBe('true');
      await actor.click(screen.getByRole('button', { name: 'Xóa lựa chọn SKU' }));
      expect(onChange).toHaveBeenCalledWith('');
      expect(onSearchChange).toHaveBeenCalledWith('');
    },
  );

  it.each(['Escape', 'Tab'])('contains %s inside the open popover', async (key) => {
    const actor = userEvent.setup();
    const windowKeyDown = vi.fn();
    const onSearchChange = vi.fn();
    window.addEventListener('keydown', windowKeyDown);
    const { trigger } = renderCombobox({ searchValue: 'stale', onSearchChange });

    await actor.click(trigger);
    fireEvent.keyDown(screen.getByRole('combobox', { name: 'Tìm kiếm SKU' }), { key });
    window.removeEventListener('keydown', windowKeyDown);

    expect(windowKeyDown).not.toHaveBeenCalled();
    expect(onSearchChange).toHaveBeenCalledWith('');
    await waitFor(() => expect(trigger.getAttribute('aria-expanded')).toBe('false'));
    await waitFor(() => expect(trigger).toBe(document.activeElement));
  });

  it.each([
    [{ isLoading: true, options: [] }, 'Đang tải danh sách...'],
    [{ isError: true, options: [] }, 'Không tải được SKU.'],
    [{ options: [] }, 'Chưa có SKU.'],
  ])('keeps the %s state visible and non-interactive', (overrides, helperText) => {
    const { trigger } = renderCombobox(overrides);

    expect(trigger.disabled).toBe(false);
    expect(trigger.getAttribute('aria-disabled')).toBe('true');
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
    const search = screen.getByRole('combobox', { name: 'Tìm kiếm SKU' });
    expect(search.getAttribute('aria-expanded')).toBe('true');
    expect(search.getAttribute('aria-autocomplete')).toBe('list');
    expect(search.getAttribute('aria-required')).toBe('true');
    expect(screen.queryByRole('combobox', { name: 'SKU' })).toBeNull();
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
    fireEvent.keyDown(screen.getByRole('combobox', { name: 'Tìm kiếm SKU' }), {
      key: 'ArrowDown',
    });

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

  it('keeps combobox touch targets at least 40px', async () => {
    const actor = userEvent.setup();
    renderCombobox({ value: 'sku-1', optional: true });

    expect(screen.getByRole('button', { name: 'Xóa lựa chọn SKU' }).className).toContain('size-10');
    await actor.click(screen.getByRole('combobox', { name: 'SKU' }));
    expect(screen.getByRole('combobox', { name: 'Tìm kiếm SKU' }).className).toContain('h-10');
    for (const option of screen.getAllByRole('option')) {
      expect(option.className).toContain('min-h-10');
    }
  });
});
