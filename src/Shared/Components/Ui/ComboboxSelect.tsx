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
 * Filtering is client-side over the currently observed `options`. For paginated/server-fetched
 * lists, pass `onSearchChange` so the caller also re-fetches; the local pass prevents stale
 * pre-debounce options from being committed while the remote response catches up.
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
  /** When provided, the caller is expected to narrow `options` with its server query as well. */
  onSearchChange?: (value: string) => void;
  searchPlaceholder?: string;
}

const triggerClassName =
  'flex h-10 w-full min-w-0 items-center justify-between gap-2 overflow-hidden rounded-md border bg-transparent px-3 text-sm shadow-sm outline-none transition-colors focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] disabled:cursor-not-allowed disabled:opacity-50 aria-disabled:cursor-not-allowed aria-disabled:opacity-50';
const MAX_CACHED_OPTIONS = 200;

function normalizeSearchText(value: string) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .trim()
    .toLocaleLowerCase('vi-VN');
}

function trimOptionCache(cache: Map<string, LookupOption>, protectedValue: string) {
  for (const cachedValue of cache.keys()) {
    if (cache.size <= MAX_CACHED_OPTIONS) break;
    if (cachedValue !== protectedValue) cache.delete(cachedValue);
  }
}

export const ComboboxSelect = React.forwardRef<HTMLButtonElement, ComboboxSelectProps>(
  function ComboboxSelect(
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
    const optionCacheRef = React.useRef(new Map<string, LookupOption>());
    const listboxId = `${id}-listbox`;
    const helperId = `${id}-helper`;

    const selectedOption = value
      ? (options.find((option) => option.value === value) ??
        optionCacheRef.current.get(value) ?? { value, label: value })
      : undefined;
    const isControlledSearch = onSearchChange != null;
    const query = isControlledSearch ? (searchValue ?? '') : internalQuery;
    const shouldPrependSelected =
      selectedOption &&
      !options.some((option) => option.value === value) &&
      (!isControlledSearch || query.trim().length === 0);
    const displayOptions = shouldPrependSelected ? [selectedOption, ...options] : options;

    const normalizedQuery = normalizeSearchText(query);
    const filteredOptions = normalizedQuery
      ? displayOptions.filter((option) =>
          normalizeSearchText(option.label).includes(normalizedQuery),
        )
      : displayOptions;

    const hasOptions = displayOptions.length > 0;
    const isDisabled = disabled || isLoading || isError || (!optional && !hasOptions);
    const canClear = Boolean(optional && selectedOption && !disabled);
    const selectableOptions = disabled || isLoading || isError ? [] : filteredOptions;
    const helperText = isLoading
      ? 'Đang tải danh sách...'
      : isError
        ? errorMessage
        : !hasOptions
          ? emptyMessage
          : null;

    const highlightedOptionValue = selectableOptions[highlightIndex]?.value;

    // Cache only options from committed renders. Mutating this ref during render can retain
    // labels from an interrupted concurrent render that the user never observed.
    React.useEffect(() => {
      for (const option of options) optionCacheRef.current.set(option.value, option);
      trimOptionCache(optionCacheRef.current, value);
    }, [options, value]);

    // Keeps highlightIndex in range if `options` shrinks for a reason other than
    // typing (e.g. an async refetch), independent of the reset-to-0 in setQuery.
    React.useEffect(() => {
      setHighlightIndex((index) =>
          Math.max(0, Math.min(index, Math.max(selectableOptions.length - 1, 0))),
        );
    }, [selectableOptions.length]);

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

    React.useEffect(() => {
      if (!disabled || !open) return;
      setOpen(false);
      if (isControlledSearch) onSearchChange?.('');
      else setInternalQuery('');
      setHighlightIndex(0);
    }, [disabled, isControlledSearch, onSearchChange, open]);

    function closePopover() {
      setOpen(false);
      setQuery('');
    }

    function commitSelection(nextValue: string) {
      if (disabled || isLoading || isError) return;
      const nextOption = displayOptions.find((option) => option.value === nextValue);
      if (nextOption) {
        optionCacheRef.current.set(nextValue, nextOption);
        trimOptionCache(optionCacheRef.current, nextValue);
      }
      onChange(nextValue);
      closePopover();
    }

    function handleTriggerKeyDown(event: React.KeyboardEvent) {
      if (isDisabled) return;
      if (event.key === 'ArrowDown' || event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        setOpen(true);
      }
    }

    function handleInputKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
      if (event.nativeEvent.isComposing) {
        event.stopPropagation();
        return;
      }
      if (event.key === 'ArrowDown') {
        event.preventDefault();
        setHighlightIndex((index) => Math.max(0, Math.min(index + 1, selectableOptions.length - 1)));
      } else if (event.key === 'ArrowUp') {
        event.preventDefault();
        setHighlightIndex((index) => Math.max(index - 1, 0));
      } else if (event.key === 'Enter') {
        event.preventDefault();
        const target = selectableOptions[highlightIndex];
        if (target) commitSelection(target.value);
      } else if (event.key === 'Escape') {
        event.preventDefault();
        event.stopPropagation();
        closePopover();
      } else if (event.key === 'Tab') {
        event.preventDefault();
        event.stopPropagation();
        closePopover();
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
                role={open ? undefined : 'combobox'}
                aria-expanded={open ? undefined : false}
                aria-haspopup={open ? undefined : 'listbox'}
                aria-controls={open ? undefined : listboxId}
                aria-required={optional ? undefined : true}
                aria-describedby={helperText ? helperId : undefined}
                aria-disabled={isDisabled || undefined}
                disabled={disabled}
                autoFocus={autoFocus}
                title={selectedOption?.label}
                className={cn(triggerClassName, canClear && 'pr-20')}
                onClick={(event) => {
                  if (isDisabled) event.preventDefault();
                }}
                onKeyDown={handleTriggerKeyDown}
              >
                <span
                  className={cn(
                    'block min-w-0 max-w-full flex-1 truncate text-left',
                    !selectedOption && 'text-muted-foreground',
                  )}
                >
                  {isLoading ? 'Đang tải...' : (selectedOption?.label ?? placeholder)}
                </span>
                <ChevronsUpDown className="size-4 shrink-0 opacity-50" />
              </button>
            </PopoverPrimitive.Trigger>
            {canClear ? (
              <button
                type="button"
                aria-label={`Xóa lựa chọn ${label}`}
                className="text-muted-foreground hover:text-foreground focus-visible:ring-ring/50 absolute top-1/2 right-8 flex size-10 -translate-y-1/2 items-center justify-center rounded-md outline-none focus-visible:ring-[3px]"
                onClick={(event) => {
                  event.stopPropagation();
                  onChange('');
                  closePopover();
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
              onEscapeKeyDown={(event) => {
                if (event.isComposing) event.preventDefault();
              }}
            >
              <Input
                ref={inputRef}
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                onKeyDown={handleInputKeyDown}
                placeholder={searchPlaceholder ?? `Tìm ${label.toLowerCase()}...`}
                aria-label={`Tìm kiếm ${label}`}
                role="combobox"
                aria-expanded="true"
                aria-haspopup="listbox"
                aria-autocomplete="list"
                aria-required={optional ? undefined : true}
                aria-describedby={helperText ? helperId : undefined}
                aria-controls={listboxId}
                aria-activedescendant={
                  selectableOptions[highlightIndex]
                    ? `${id}-option-${selectableOptions[highlightIndex].value}`
                    : undefined
                }
                className="mb-1 h-10"
              />
              <ul id={listboxId} role="listbox" className="max-h-60 overflow-y-auto">
                {selectableOptions.length === 0 ? (
                  <li className="text-muted-foreground px-2 py-1.5 text-sm">
                    {isLoading
                      ? 'Đang tải danh sách...'
                      : isError
                        ? errorMessage
                        : 'Không tìm thấy kết quả.'}
                  </li>
                ) : (
                  selectableOptions.map((option, index) => (
                    <li
                      key={option.value}
                      id={`${id}-option-${option.value}`}
                      ref={(node) => {
                        optionRefs.current[index] = node;
                      }}
                      role="option"
                      aria-selected={option.value === value}
                      className={cn(
                        'flex min-h-10 cursor-pointer items-center justify-between gap-2 rounded-sm px-2 py-2 text-sm',
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
  },
);
