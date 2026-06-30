// @vitest-environment jsdom
import { renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

const h = vi.hoisted(() => ({ useReasonCodes: vi.fn() }));
vi.mock('@modules/ReasonCode/Application/Queries/UseReasonCodeQueries', () => ({
  useReasonCodes: h.useReasonCodes,
}));

import { useReasonCodeOptions } from '@modules/ReasonCode/Application/Queries/UseReasonCodeOptions';

describe('useReasonCodeOptions', () => {
  afterEach(() => vi.clearAllMocks());

  it('defaults to ACTIVE + pageSize 100 and maps value=reasonCode, label=code — description', () => {
    h.useReasonCodes.mockReturnValue({
      data: {
        items: [
          { reasonCode: 'RC-A', description: 'Lý do A' },
          { reasonCode: 'RC-B', description: null },
        ],
      },
      isLoading: false,
      isError: false,
    });

    const { result } = renderHook(() => useReasonCodeOptions());

    expect(h.useReasonCodes).toHaveBeenCalledWith({ status: 'ACTIVE', pageSize: 100 });
    expect(result.current.options).toEqual([
      { value: 'RC-A', label: 'RC-A — Lý do A' },
      { value: 'RC-B', label: 'RC-B' },
    ]);
  });

  it('merges a caller filter (action=Override) over the ACTIVE defaults', () => {
    h.useReasonCodes.mockReturnValue({ data: { items: [] }, isLoading: true, isError: false });

    const { result } = renderHook(() => useReasonCodeOptions({ action: 'Override' }));

    expect(h.useReasonCodes).toHaveBeenCalledWith({
      status: 'ACTIVE',
      pageSize: 100,
      action: 'Override',
    });
    expect(result.current.isLoading).toBe(true);
    expect(result.current.options).toEqual([]);
  });

  it('passes objectType filters through to the ReasonCode query', () => {
    h.useReasonCodes.mockReturnValue({ data: { items: [] }, isLoading: false, isError: false });

    renderHook(() => useReasonCodeOptions({ action: 'Update', objectType: 'Warehouse' }));

    expect(h.useReasonCodes).toHaveBeenCalledWith({
      status: 'ACTIVE',
      pageSize: 100,
      action: 'Update',
      objectType: 'Warehouse',
    });
  });

  it('hides placeholder options from a previous action/objectType while the new query loads', () => {
    h.useReasonCodes.mockReturnValue({
      data: { items: [{ reasonCode: 'RC-OLD', description: 'Old context' }] },
      isLoading: false,
      isError: false,
      isPlaceholderData: true,
    });

    const { result } = renderHook(() => useReasonCodeOptions({ action: 'Update', objectType: 'Warehouse' }));

    expect(result.current.options).toEqual([]);
    expect(result.current.isLoading).toBe(true);
  });
});
