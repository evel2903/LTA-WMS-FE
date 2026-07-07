import { Input } from '@shared/Components/Ui/Input';
import { LookupSelect } from '@shared/Components/Ui/LookupSelect';
import type { LookupSelectProps } from '@shared/Components/Ui/LookupSelect';

/**
 * `LookupSelect` plus a search box above it, for lookups with more entries than a single
 * fetched page (IFB-16). Composes `LookupSelect` unchanged so every other consumer of it
 * keeps its current behavior; the search box only narrows `options` via the caller's own
 * debounced query, it does not filter client-side.
 */
export interface SearchableLookupSelectProps extends LookupSelectProps {
  searchValue: string;
  onSearchChange: (value: string) => void;
  searchPlaceholder?: string;
}

export function SearchableLookupSelect({
  searchValue,
  onSearchChange,
  searchPlaceholder,
  ...lookupSelectProps
}: SearchableLookupSelectProps) {
  return (
    <div className="grid gap-1">
      <Input
        type="text"
        value={searchValue}
        onChange={(event) => onSearchChange(event.target.value)}
        placeholder={searchPlaceholder ?? `Tìm ${lookupSelectProps.label.toLowerCase()}...`}
        aria-label={`Tìm kiếm ${lookupSelectProps.label}`}
      />
      <LookupSelect {...lookupSelectProps} />
    </div>
  );
}
