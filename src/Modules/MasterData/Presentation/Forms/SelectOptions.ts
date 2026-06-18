export interface SelectOption {
  value: string;
  label: string;
}

/**
 * Ensures a FK `<select>` can always render its current value. When the
 * currently-assigned id is not part of the active options (e.g. the referenced
 * Owner/UOM has since been deactivated or removed), it is surfaced as an
 * explicit `(unavailable)` option so the select keeps showing the stored value
 * instead of silently snapping to the first option.
 */
export function mergeSelectedOption(
  options: SelectOption[],
  currentId?: string | null,
): SelectOption[] {
  if (currentId && !options.some((option) => option.value === currentId)) {
    return [{ value: currentId, label: `${currentId} (unavailable)` }, ...options];
  }
  return options;
}
