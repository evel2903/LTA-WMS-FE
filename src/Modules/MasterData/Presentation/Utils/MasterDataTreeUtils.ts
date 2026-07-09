import type { SiteLocationTree } from '@modules/MasterData/Domain/Types/MasterDataTree';

export function countDescendants(node: SiteLocationTree, type: SiteLocationTree['type']): number {
  return node.children.reduce((total, child) => {
    const own = child.type === type ? 1 : 0;
    return total + own + countDescendants(child, type);
  }, 0);
}

export function normalized(value: string): string {
  return value.trim().toLocaleLowerCase('vi-VN');
}
