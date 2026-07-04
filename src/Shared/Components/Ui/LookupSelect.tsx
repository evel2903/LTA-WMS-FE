/**
 * LookupSelect — native styled `<select>` for master-data dropdowns (SKU, UOM, owner,
 * warehouse, reason code, …). Handles loading / error / empty states with helper text.
 * Extracted from InboundCreatePage so every Inbound panel (and other modules) can reuse it.
 */
export interface LookupOption {
  value: string;
  label: string;
}

export interface LookupSelectProps {
  id: string;
  name: string;
  label: string;
  value: string;
  placeholder: string;
  options: LookupOption[];
  isLoading: boolean;
  isError: boolean;
  emptyMessage: string;
  errorMessage: string;
  optional?: boolean;
  /** External disable (OR-ed with the internal loading/error/empty disable). */
  disabled?: boolean;
  autoFocus?: boolean;
  onChange: (value: string) => void;
}

// `w-full min-w-0` is essential: a native <select> defaults to min-width:auto (sizes to its
// widest option), which overflows narrow grid columns and visually overlaps the next field.
// `h-10` (not h-9): 40px RF touch-target floor for warehouse-floor operators on
// handheld/tablet devices (IFB-09).
const selectClassName =
  'h-10 w-full min-w-0 rounded-md border bg-transparent px-3 text-sm shadow-sm outline-none transition-colors focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] disabled:cursor-not-allowed disabled:opacity-50';

export function LookupSelect({
  id,
  name,
  label,
  value,
  placeholder,
  options,
  isLoading,
  isError,
  emptyMessage,
  errorMessage,
  optional = false,
  disabled = false,
  autoFocus = false,
  onChange,
}: LookupSelectProps) {
  // Keep a currently-selected value that isn't in the fetched list (e.g. a seed/legacy code)
  // selectable, so switching to a dropdown never silently drops an already-chosen value.
  const displayOptions =
    value && !options.some((option) => option.value === value)
      ? [{ value, label: value }, ...options]
      : options;
  // Disable/empty-helper key off what is actually shown (displayOptions), so a preserved
  // legacy value never reads as "disabled + no codes available" at the same time.
  const hasOptions = displayOptions.length > 0;
  const isDisabled =
    disabled || isLoading || isError || (!optional && !hasOptions) || (optional && !hasOptions);
  const helperId = `${id}-helper`;
  const helperText = isLoading
    ? 'Đang tải danh sách...'
    : isError
      ? errorMessage
      : !hasOptions
        ? emptyMessage
        : null;

  // Helper text is a sibling (not inside the <label>) so it does not pollute the control's
  // accessible name — keeps getByLabelText reliable in loading/empty/error states.
  return (
    <div className="grid gap-1 text-sm">
      <label htmlFor={id}>{label}</label>
      <select
        id={id}
        name={name}
        className={selectClassName}
        value={value}
        disabled={isDisabled}
        autoFocus={autoFocus}
        aria-describedby={helperText ? helperId : undefined}
        onChange={(event) => onChange(event.target.value)}
      >
        <option value="">{isLoading ? 'Đang tải...' : placeholder}</option>
        {displayOptions.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      {helperText ? (
        <span id={helperId} className="text-muted-foreground text-xs">
          {helperText}
        </span>
      ) : null}
    </div>
  );
}
