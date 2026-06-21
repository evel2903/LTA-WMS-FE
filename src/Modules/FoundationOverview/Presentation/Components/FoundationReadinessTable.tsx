import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';

import { Button } from '@shared/Components/Ui/Button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@shared/Components/Ui/Table';
import type {
  MasterDataReadinessRow,
  WarehouseProfileReadinessRow,
} from '@modules/FoundationOverview/Domain/Entities/FoundationReadiness';
import { FoundationStatusBadge } from '@modules/FoundationOverview/Presentation/Components/FoundationStatusBadge';

interface MasterDataReadinessTableProps {
  rows: MasterDataReadinessRow[];
  links: Partial<Record<MasterDataReadinessRow['key'], string>>;
}

interface WarehouseProfileReadinessTableProps {
  rows: WarehouseProfileReadinessRow[];
  profileTo: string;
}

export function MasterDataReadinessTable({ rows, links }: MasterDataReadinessTableProps) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Area</TableHead>
          <TableHead>Count</TableHead>
          <TableHead>Status</TableHead>
          <TableHead>Message</TableHead>
          <TableHead className="w-28">Action</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((row) => {
          const link = links[row.key];
          return (
            <TableRow key={row.key}>
              <TableCell className="font-medium">{row.label}</TableCell>
              <TableCell>{row.count}</TableCell>
              <TableCell>
                <FoundationStatusBadge status={row.status} />
              </TableCell>
              <TableCell className="text-muted-foreground whitespace-normal">
                {row.message}
              </TableCell>
              <TableCell>
                {link ? (
                  <Button asChild size="sm" variant="outline">
                    <Link to={link}>
                      Open
                      <ArrowRight className="size-4" />
                    </Link>
                  </Button>
                ) : null}
              </TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
}

export function WarehouseProfileReadinessTable({
  rows,
  profileTo,
}: WarehouseProfileReadinessTableProps) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Warehouse</TableHead>
          <TableHead>Type</TableHead>
          <TableHead>Active profile</TableHead>
          <TableHead>Checklist</TableHead>
          <TableHead>Status</TableHead>
          <TableHead className="w-28">Action</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((row) => (
          <TableRow key={row.warehouseId}>
            <TableCell>
              <div className="font-medium">{row.warehouseCode}</div>
              <div className="text-muted-foreground text-xs">{row.warehouseName}</div>
            </TableCell>
            <TableCell>{row.warehouseTypeCode}</TableCell>
            <TableCell>
              {row.activeProfileCode ? (
                <>
                  <div className="font-medium">{row.activeProfileCode}</div>
                  <div className="text-muted-foreground text-xs">{row.activeProfileName}</div>
                </>
              ) : (
                <span className="text-muted-foreground">None</span>
              )}
            </TableCell>
            <TableCell className="text-muted-foreground whitespace-normal">{row.message}</TableCell>
            <TableCell>
              <FoundationStatusBadge status={row.status} />
            </TableCell>
            <TableCell>
              <Button asChild size="sm" variant="outline">
                <Link to={profileTo}>
                  Open
                  <ArrowRight className="size-4" />
                </Link>
              </Button>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
