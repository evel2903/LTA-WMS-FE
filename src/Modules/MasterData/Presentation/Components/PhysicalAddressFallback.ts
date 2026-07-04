import type { Location } from '@modules/MasterData/Domain/Types/MasterDataTree';

export type PhysicalAddressPart = 'aisle' | 'rack' | 'level' | 'bin';

export function explicitPhysicalField(value: string | null | undefined): string | null {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

export function physicalFilterValue(location: Location, part: PhysicalAddressPart): string {
  const explicit =
    part === 'aisle'
      ? explicitPhysicalField(location.aisleCode)
      : part === 'rack'
        ? explicitPhysicalField(location.rackCode)
        : part === 'level'
          ? explicitPhysicalField(location.levelCode)
          : explicitPhysicalField(location.binCode);

  return explicit ?? fallbackPhysicalField(location, part) ?? '';
}

export function physicalFieldDisplay(location: Location, part: PhysicalAddressPart, emptyText = 'Chưa cấu hình'): string {
  return physicalFilterValue(location, part) || emptyText;
}

export function locationWithPhysicalFallback(location: Location): Location {
  return {
    ...location,
    aisleCode: explicitPhysicalField(location.aisleCode) ?? fallbackPhysicalField(location, 'aisle') ?? location.aisleCode,
    rackCode: explicitPhysicalField(location.rackCode) ?? fallbackPhysicalField(location, 'rack') ?? location.rackCode,
    levelCode: explicitPhysicalField(location.levelCode) ?? fallbackPhysicalField(location, 'level') ?? location.levelCode,
    binCode: explicitPhysicalField(location.binCode) ?? fallbackPhysicalField(location, 'bin') ?? location.binCode,
  };
}

export function fallbackPhysicalField(location: Location, part: PhysicalAddressPart): string | null {
  const parts = physicalNumericParts(location.locationCode);
  const order = positiveLocationOrder(location);
  const value =
    part === 'aisle'
      ? parts[0]
      : part === 'rack'
        ? (parts[1] ?? order)
        : part === 'level'
          ? (parts[2] ?? (parts.length > 0 ? 1 : null))
          : (parts[3] ?? order ?? parts[1] ?? (parts.length > 0 ? 1 : null));

  return value == null ? null : String(value).padStart(2, '0');
}

function physicalNumericParts(code: string): number[] {
  return (code.match(/\d+/g) ?? []).map((part) => Number(part)).filter(Number.isFinite);
}

function positiveLocationOrder(location: Location): number | null {
  return [location.pickSequence, location.putawaySequence].find((order) => typeof order === 'number' && order > 0) ?? null;
}
