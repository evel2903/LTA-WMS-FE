import { Building2, Map, MapPin, Warehouse } from 'lucide-react';

import { Button } from '@shared/Components/Ui/Button';
import { cn } from '@shared/Utils/Cn';
import type { SiteLocationTree } from '@modules/MasterData/Domain/Types/MasterDataTree';
import { MasterDataStatusBadge } from '@modules/MasterData/Presentation/Components/MasterDataStatusBadge';

const NODE_ICONS = {
  site: Building2,
  warehouse: Warehouse,
  zone: Map,
  location: MapPin,
} as const;

interface EntityTreeProps {
  nodes: SiteLocationTree[];
  selectedNodeId: string | null;
  onSelect: (node: SiteLocationTree) => void;
}

interface EntityTreeNodeProps {
  node: SiteLocationTree;
  selectedNodeId: string | null;
  onSelect: (node: SiteLocationTree) => void;
  depth: number;
}

function EntityTreeNode({ node, selectedNodeId, onSelect, depth }: EntityTreeNodeProps) {
  const Icon = NODE_ICONS[node.type];
  const selected = node.id === selectedNodeId;

  return (
    <li role="treeitem" aria-selected={selected} className="space-y-1">
      <Button
        type="button"
        variant={selected ? 'secondary' : 'ghost'}
        className={cn('h-auto w-full justify-start px-2 py-2 text-left', depth > 0 && 'ml-4')}
        onClick={() => onSelect(node)}
      >
        <Icon className="size-4 shrink-0" aria-hidden="true" />
        <span className="min-w-0 flex-1 truncate">{node.label}</span>
        <MasterDataStatusBadge status={node.status} />
      </Button>
      {node.children.length > 0 && (
        <ul role="group" className="space-y-1">
          {node.children.map((child) => (
            <EntityTreeNode
              key={child.id}
              node={child}
              selectedNodeId={selectedNodeId}
              onSelect={onSelect}
              depth={depth + 1}
            />
          ))}
        </ul>
      )}
    </li>
  );
}

export function EntityTree({ nodes, selectedNodeId, onSelect }: EntityTreeProps) {
  return (
    <ul role="tree" aria-label="Cây kho và vị trí" className="space-y-1">
      {nodes.map((node) => (
        <EntityTreeNode
          key={node.id}
          node={node}
          selectedNodeId={selectedNodeId}
          onSelect={onSelect}
          depth={0}
        />
      ))}
    </ul>
  );
}
