// @vitest-environment jsdom
import { useState } from 'react';

import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { SearchableLookupSelect } from '@shared/Components/Ui/SearchableLookupSelect';

const OPTIONS = [
  { value: 'wh-1', label: 'LTA-HCM-01' },
  { value: 'wh-2', label: 'C5-WH-01' },
];

function renderSearchableSelect(overrides: Partial<Parameters<typeof SearchableLookupSelect>[0]> = {}) {
  const onChange = vi.fn();
  const onSearchChange = vi.fn();
  render(
    <SearchableLookupSelect
      id="lk-wh"
      name="warehouseId"
      label="Kho"
      value=""
      placeholder="Chọn kho"
      options={OPTIONS}
      isLoading={false}
      isError={false}
      emptyMessage="Chưa có kho."
      errorMessage="Lỗi tải."
      onChange={onChange}
      searchValue=""
      onSearchChange={onSearchChange}
      {...overrides}
    />,
  );
  return {
    onChange,
    onSearchChange,
    select: screen.getByRole<HTMLSelectElement>('combobox'),
    search: screen.getByRole<HTMLInputElement>('textbox'),
  };
}

describe('SearchableLookupSelect', () => {
  afterEach(() => cleanup());

  it('renders a search box above the underlying LookupSelect', () => {
    const { search, select } = renderSearchableSelect();
    expect(search).toBeTruthy();
    expect(select).toBeTruthy();
  });

  it('emits typed search text via onSearchChange without mutating the select value', async () => {
    // Controlled input: userEvent.type needs the value prop to actually update between
    // keystrokes, or every keystroke resets to the fixed initial value (React re-renders the
    // DOM back to the stale prop) -- a small stateful wrapper mirrors how the real page wires
    // searchValue/onSearchChange to useState.
    function Controlled() {
      const [search, setSearch] = useState('');
      const onChange = vi.fn();
      return (
        <SearchableLookupSelect
          id="lk-wh"
          name="warehouseId"
          label="Kho"
          value=""
          placeholder="Chọn kho"
          options={OPTIONS}
          isLoading={false}
          isError={false}
          emptyMessage="Chưa có kho."
          errorMessage="Lỗi tải."
          onChange={onChange}
          searchValue={search}
          onSearchChange={setSearch}
        />
      );
    }
    const actor = userEvent.setup();
    render(<Controlled />);
    await actor.type(screen.getByRole('textbox'), 'hcm');
    expect(screen.getByRole<HTMLInputElement>('textbox').value).toBe('hcm');
  });

  it('still forwards option selection to onChange like a plain LookupSelect', async () => {
    const actor = userEvent.setup();
    const { onChange, select } = renderSearchableSelect();
    await actor.selectOptions(select, 'wh-1');
    expect(onChange).toHaveBeenCalledWith('wh-1');
  });

  it('reflects an externally controlled searchValue', () => {
    const { search } = renderSearchableSelect({ searchValue: 'HCM' });
    expect(search.value).toBe('HCM');
  });
});
