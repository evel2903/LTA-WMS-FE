import { Card, CardContent, CardHeader, CardTitle } from '@shared/Components/Ui/Card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@shared/Components/Ui/Table';
import type { InboundPlanLine } from '@modules/InboundPlan/Domain/Types/InboundPlan';

// Same formatting as InboundLineRail.tsx (InboundReceiving module) -- kept in sync so a
// plan's expected quantity reads identically whether viewed from the Plan or Receiving side.
function formatQuantity(value: number) {
  return new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 4 }).format(value);
}

interface InboundPlanLinesTableProps {
  lines: InboundPlanLine[];
}

// IPR-03: read-only display of a plan's SKU/UOM/expected-quantity lines, restored to the
// Plan detail page after the IPR-01 split moved line rendering entirely into InboundReceiving.
// Null skuCode/uomCode/externalLineReference fallbacks mirror InboundLineRail.tsx exactly
// (same InboundPlanLine shape, same IPR-02 deactivated-SKU/UOM edge case) for consistency
// between the two modules -- deliberately NOT a new placeholder convention.
export function InboundPlanLinesTable({ lines }: InboundPlanLinesTableProps) {
  const sortedLines = [...lines].sort((a, b) => a.lineNumber - b.lineNumber);

  return (
    <Card data-testid="inbound-plan-lines-table">
      <CardHeader>
        <CardTitle className="text-base">Dòng hàng dự kiến</CardTitle>
      </CardHeader>
      <CardContent>
        {sortedLines.length ? (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Số dòng</TableHead>
                <TableHead>SKU</TableHead>
                <TableHead>UOM</TableHead>
                <TableHead>Số lượng dự kiến</TableHead>
                <TableHead>Tham chiếu dòng ngoài</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedLines.map((line) => (
                <TableRow key={line.id} data-testid={`inbound-plan-line-row-${line.id}`}>
                  <TableCell>{line.lineNumber}</TableCell>
                  <TableCell>{line.skuCode ?? line.skuId}</TableCell>
                  <TableCell>{line.uomCode ?? ''}</TableCell>
                  <TableCell>{formatQuantity(line.expectedQuantity)}</TableCell>
                  <TableCell>{line.externalLineReference ?? 'không có'}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        ) : (
          <p className="text-sm text-muted-foreground">Kế hoạch này chưa có dòng hàng nào.</p>
        )}
      </CardContent>
    </Card>
  );
}
