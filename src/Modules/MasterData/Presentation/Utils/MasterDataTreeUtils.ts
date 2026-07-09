import type { SiteLocationTree } from '@modules/MasterData/Domain/Types/MasterDataTree';

export type SiteNode = Extract<SiteLocationTree, { type: 'site' }>;
export type WarehouseNode = Extract<SiteLocationTree, { type: 'warehouse' }>;
export type ZoneNode = Extract<SiteLocationTree, { type: 'zone' }>;
export type LocationNode = Extract<SiteLocationTree, { type: 'location' }>;

export function countDescendants(node: SiteLocationTree, type: SiteLocationTree['type']): number {
  return node.children.reduce((total, child) => {
    const own = child.type === type ? 1 : 0;
    return total + own + countDescendants(child, type);
  }, 0);
}

export function normalized(value: string): string {
  return value.trim().toLocaleLowerCase('vi-VN');
}
