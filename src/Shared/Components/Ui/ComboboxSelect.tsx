import * as React from 'react';
import * as PopoverPrimitive from '@radix-ui/react-popover';
import { Check, ChevronsUpDown, X } from 'lucide-react';

import { cn } from '@shared/Utils/Cn';
import { Input } from '@shared/Components/Ui/Input';
import type { LookupOption } from '@shared/Components/Ui/LookupSelect';

/**
 * ComboboxSelect — searchable single-select dropdown ("select2"-style), the shared
 * replacement for plain `<select>`/`LookupSelect` across master-data pickers. Same
 * prop shape as `LookupSelectProps` so it drop-in replaces a native select at any
 * call site. Built on Radix Popover (already MIT-licensed, no paid registry) instead
 * of ReUI's Combobox, which requires a paid license we don't have.
 *
 * Filtering is client-side over `options` by default — fine for small/complete lists
 * (status enums, taxonomies). For paginated/server-fetched lists, pass `onSearchChange`
 * so the caller re-fetches instead of relying on local filtering.
 */
export interface ComboboxSelectProps {
  id: string;
  name: string;
  label: string;
  value: string;
  placeholder: string;
  options: LookupOption[];
  isLoading?: boolean;
  isError?: boolean;
  emptyMessage?: string;
  errorMessage?: string;
  optional?: boolean;
  disabled?: boolean;
  autoFocus?: boolean;
  onChange: (value: string) => void;
  /** Search text, when the caller wants to control/debounce it itself (server-side filter). */
  searchValue?: string;
  /** When provided, disables local filtering — the caller is expected to narrow `options` itself. */
  onSearchChange?: (value: string) => void;
  searchPlaceholder?: string;
}

const triggerClassName =
  'flex h-10 w-full min-w-0 items-center justify-between gap-2 overflow-hidden rounded-md border bg-transparent px-3 text-sm shadow-sm outline-none transition-colors focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] disabled:cursor-not-allowed disabled:opacity-50';

export const ComboboxSelect = React.forwardRef<HTMLButtonElement, ComboboxSelectProps>(function ComboboxSelect(
  {
    id,
    name,
    label,
    value,
    placeholder,
    options,
    isLoading = false,
    isError = false,
    emptyMessage = 'Không có lựa chọn phù hợp.',
    errorMessage = 'Không tải được danh sách.',
    optional = false,
    disabled = false,
    autoFocus = false,
    onChange,
    searchValue,
    onSearchChange,
    searchPlaceholder,
  },
  ref,
) {
  const [open, setOpen] = React.useState(false);
  const [internalQuery, setInternalQuery] = React.useState('');
  const [highlightIndex, setHighlightIndex] = React.useState(0);
  const inputRef = React.useRef<HTMLInputElement>(null);
  const optionRefs = React.useRef<Array<HTMLLIElement | null>>([]);
  const listboxId = `${id}-listbox`;
  const helperId = `${id}-helper`;

  // Keep a currently-selected value that isn't in the fetched list (e.g. legacy/seed data)
  // selectable, so switching to this control never silently drops an already-chosen value.
  const displayOptions =
    value && !options.some((option) => option.value === value)
      ? [{ value, label: value }, ...options]
      : options;

  const isControlledSearch = onSearchChange != null;
  const query = isControlledSearch ? (searchValue ?? '') : internalQuery;
  const filteredOptions = isControlledSearch
    ? displayOptions
    : displayOptions.filter((option) =>
        option.label.toLocaleLowerCase('vi-VN').includes(query.trim().toLocaleLowerCase('vi-VN')),
      );

  const hasOptions = displayOptions.length > 0;
  const isDisabled = disabled || isLoading || isError || (!optional && !hasOptions);
  const helperText = isLoading
    ? 'Đang tải danh sách...'
    : isError
      ? errorMessage
      : !hasOptions
        ? emptyMessage
        : null;

  const selectedOption = displayOptions.find((option) => option.value === value);
  const highlightedOptionValue = filteredOptions[highlightIndex]?.value;

  // Keeps highlightIndex in range if `options` shrinks for a reason other than
  // typing (e.g. an async refetch), independent of the reset-to-0 in setQuery.
  React.useEffect(() => {
    setHighlightIndex((index) => Math.max(0, Math.min(index, Math.max(filteredOptions.length - 1, 0))));
  }, [filteredOptions.length]);

  React.useEffect(() => {
    if (!open) return;
    optionRefs.current[highlightIndex]?.scrollIntoView?.({ block: 'nearest' });
  }, [highlightIndex, highlightedOptionValue, open]);

  function setQuery(next: string) {
    if (isControlledSearch) {
      onSearchChange?.(next);
    } else {
      setInternalQuery(next);
    }
    setHighlightIndex(0);
  }

  function commitSelection(nextValue: string) {
    onChange(nextValue);
    setOpen(false);
    setQuery('');
  }

  function handleTriggerKeyDown(event: React.KeyboardEvent) {
    if (isDisabled) return;
    if (event.key === 'ArrowDown' || event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      setOpen(true);
    }
  }

  function handleInputKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setHighlightIndex((index) => Math.max(0, Math.min(index + 1, filteredOptions.length - 1)));
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      setHighlightIndex((index) => Math.max(index - 1, 0));
    } else if (event.key === 'Enter') {
      event.preventDefault();
      const target = filteredOptions[highlightIndex];
      if (target) commitSelection(target.value);
    } else if (event.key === 'Escape') {
      setOpen(false);
    }
  }

  return (
    <div className="grid min-w-0 gap-1 text-sm">
      <label htmlFor={id}>{label}</label>
      <PopoverPrimitive.Root
        open={open}
        onOpenChange={(next) => {
          setOpen(next);
          if (next) setHighlightIndex(0);
          else setQuery('');
        }}
      >
        <div className="relative min-w-0">
          <PopoverPrimitive.Trigger asChild>
            <button
              ref={ref}
              type="button"
              id={id}
              name={name}
              role="combobox"
              aria-expanded={open}
              aria-haspopup="listbox"
              aria-controls={listboxId}
              aria-required={optional ? undefined : true}
              aria-describedby={helperText ? helperId : undefined}
              disabled={isDisabled}
              autoFocus={autoFocus}
              title={selectedOption?.label}
              className={cn(triggerClassName)}
              onKeyDown={handleTriggerKeyDown}
            >
              <span
                className={cn('block min-w-0 max-w-full flex-1 truncate text-left', !selectedOption && 'text-muted-foreground')}
              >
                {isLoading ? 'Đang tải...' : (selectedOption?.label ?? placeholder)}
              </span>
              <ChevronsUpDown className="size-4 shrink-0 opacity-50" />
            </button>
          </PopoverPrimitive.Trigger>
          {optional && selectedOption && !isDisabled ? (
            <button
              type="button"
              aria-label={`Xóa lựa chọn ${label}`}
              className="text-muted-foreground hover:text-foreground focus-visible:ring-ring/50 absolute top-1/2 right-8 -translate-y-1/2 rounded-sm p-0.5 outline-none focus-visible:ring-[3px]"
              onClick={(event) => {
                event.stopPropagation();
                onChange('');
              }}
            >
              <X className="size-3.5" />
            </button>
          ) : null}
        </div>
        <PopoverPrimitive.Portal>
          <PopoverPrimitive.Content
            align="start"
            sideOffset={4}
            className="bg-popover text-popover-foreground z-50 w-(--radix-popover-trigger-width) rounded-md border p-1 shadow-md outline-none"
            onOpenAutoFocus={(event) => {
              event.preventDefault();
              inputRef.current?.focus();
            }}
          >
            <Input
              ref={inputRef}
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              onKeyDown={handleInputKeyDown}
              placeholder={searchPlaceholder ?? `Tìm ${label.toLowerCase()}...`}
              aria-label={`Tìm kiếm ${label}`}
              aria-controls={listboxId}
              aria-activedescendant={
                filteredOptions[highlightIndex] ? `${id}-option-${filteredOptions[highlightIndex].value}` : undefined
              }
              className="mb-1 h-9"
            />
            <ul id={listboxId} role="listbox" className="max-h-60 overflow-y-auto">
              {filteredOptions.length === 0 ? (
                <li className="text-muted-foreground px-2 py-1.5 text-sm">Không tìm thấy kết quả.</li>
              ) : (
                filteredOptions.map((option, index) => (
                  <li
                    key={option.value}
                    id={`${id}-option-${option.value}`}
                    ref={(node) => {
                      optionRefs.current[index] = node;
                    }}
                    role="option"
                    aria-selected={option.value === value}
                    className={cn(
                      'flex cursor-pointer items-center justify-between gap-2 rounded-sm px-2 py-1.5 text-sm',
                      index === highlightIndex && 'bg-accent text-accent-foreground',
                    )}
                    onMouseEnter={() => setHighlightIndex(index)}
                    onClick={() => commitSelection(option.value)}
                  >
                    <span className="min-w-0 flex-1 break-words">{option.label}</span>
                    {option.value === value && <Check className="size-4 shrink-0" />}
                  </li>
                ))
              )}
            </ul>
          </PopoverPrimitive.Content>
        </PopoverPrimitive.Portal>
      </PopoverPrimitive.Root>
      {helperText ? (
        <span id={helperId} className="text-muted-foreground text-xs">
          {helperText}
        </span>
      ) : null}
    </div>
  );
});
