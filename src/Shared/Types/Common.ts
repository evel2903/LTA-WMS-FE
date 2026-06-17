/** Branded id helper — prevents passing a raw string where a typed id is expected. */
export type Id<TBrand extends string> = string & { readonly __brand: TBrand };

/** Discriminated result for use-case return values that can fail predictably. */
export type Result<TValue, TError = string> =
  | { ok: true; value: TValue }
  | { ok: false; error: TError };

export type Nullable<T> = T | null;

export type ISODateString = string;
