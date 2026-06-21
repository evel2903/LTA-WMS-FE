import { useMemo, useState } from 'react';

import { Card, CardContent, CardHeader, CardTitle } from '@shared/Components/Ui/Card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@shared/Components/Ui/Table';
import { cn } from '@shared/Utils/Cn';
import type {
  ControlExceptionCatalogItem,
  ControlValidationCatalog,
} from '@modules/ControlValidationCatalog/Domain/Entities/ControlValidationCatalog';
import {
  BooleanRequirement,
  CatalogImplementationStatusBadge,
  ControlDefaultStateBadge,
  ControlSeverityBadge,
} from '@modules/ControlValidationCatalog/Presentation/Components/ControlValidationStatusBadge';

type CatalogTab = 'validation' | 'exceptions';

interface ControlValidationCatalogTablesProps {
  catalog: ControlValidationCatalog;
  filteredCatalog: ControlValidationCatalog;
}

function EmptyFilterResult() {
  return (
    <div className="text-muted-foreground rounded-md border py-8 text-center text-sm">
      No catalog entries match the current filter.
    </div>
  );
}

function TabButton({
  active,
  count,
  label,
  onClick,
}: {
  active: boolean;
  count: number;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      onClick={onClick}
      className={cn(
        'inline-flex h-9 items-center gap-2 rounded-md border px-3 text-sm font-medium transition-colors',
        active
          ? 'bg-primary text-primary-foreground'
          : 'bg-background text-muted-foreground hover:bg-muted hover:text-foreground',
      )}
    >
      {label}
      <span
        className={cn(
          'rounded px-1.5 py-0.5 text-xs',
          active ? 'bg-primary-foreground/20' : 'bg-muted text-muted-foreground',
        )}
      >
        {count}
      </span>
    </button>
  );
}

function valueOrNa(value: string | null | undefined) {
  return value && value.trim() ? value : 'n/a';
}

function ValidationRulesTable({
  catalog,
  exceptionsByCode,
}: {
  catalog: ControlValidationCatalog;
  exceptionsByCode: Map<string, ControlExceptionCatalogItem>;
}) {
  if (catalog.validationRules.length === 0) {
    return <EmptyFilterResult />;
  }

  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Code</TableHead>
            <TableHead>Description</TableHead>
            <TableHead>Trigger</TableHead>
            <TableHead>Severity</TableHead>
            <TableHead>Default state</TableHead>
            <TableHead>Evidence</TableHead>
            <TableHead>Owner</TableHead>
            <TableHead>Status</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {catalog.validationRules.map((item) => {
            const linkedException = item.controlExceptionCode
              ? exceptionsByCode.get(item.controlExceptionCode)
              : undefined;
            return (
              <TableRow key={item.code}>
                <TableCell className="font-medium">{item.code}</TableCell>
                <TableCell className="min-w-[240px]">{item.description}</TableCell>
                <TableCell className="text-muted-foreground min-w-[180px] text-xs">
                  {item.trigger}
                </TableCell>
                <TableCell>
                  {linkedException ? (
                    <ControlSeverityBadge severity={linkedException.severity} />
                  ) : (
                    <span className="text-muted-foreground">n/a</span>
                  )}
                </TableCell>
                <TableCell>
                  {linkedException ? (
                    <ControlDefaultStateBadge state={linkedException.defaultState} />
                  ) : (
                    <span className="text-muted-foreground">n/a</span>
                  )}
                </TableCell>
                <TableCell>
                  {linkedException ? (
                    <BooleanRequirement
                      value={linkedException.evidenceRequired}
                      label={`${item.code} evidence`}
                    />
                  ) : (
                    <span className="text-muted-foreground">n/a</span>
                  )}
                </TableCell>
                <TableCell className="text-xs">{item.ownerModule}</TableCell>
                <TableCell>
                  <CatalogImplementationStatusBadge status={item.implementationStatus} />
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}

function ControlExceptionsTable({ catalog }: { catalog: ControlValidationCatalog }) {
  if (catalog.controlExceptions.length === 0) {
    return <EmptyFilterResult />;
  }

  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Code</TableHead>
            <TableHead>Scenario</TableHead>
            <TableHead>Category</TableHead>
            <TableHead>Severity</TableHead>
            <TableHead>Default state</TableHead>
            <TableHead>Evidence</TableHead>
            <TableHead>Action allowed</TableHead>
            <TableHead>Status</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {catalog.controlExceptions.map((item) => (
            <TableRow key={item.code}>
              <TableCell className="font-medium">{item.code}</TableCell>
              <TableCell className="min-w-[240px]">{item.scenario}</TableCell>
              <TableCell className="text-muted-foreground text-xs">{item.category}</TableCell>
              <TableCell>
                <ControlSeverityBadge severity={item.severity} />
              </TableCell>
              <TableCell>
                <ControlDefaultStateBadge state={item.defaultState} />
              </TableCell>
              <TableCell>
                <BooleanRequirement value={item.evidenceRequired} label={`${item.code} evidence`} />
              </TableCell>
              <TableCell className="text-xs">{valueOrNa(item.actionAllowed)}</TableCell>
              <TableCell>
                <CatalogImplementationStatusBadge status={item.implementationStatus} />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

export function ControlValidationCatalogTables({
  catalog,
  filteredCatalog,
}: ControlValidationCatalogTablesProps) {
  const [activeTab, setActiveTab] = useState<CatalogTab>('validation');
  const exceptionsByCode = useMemo(
    () => new Map(catalog.controlExceptions.map((item) => [item.code, item])),
    [catalog.controlExceptions],
  );

  return (
    <Card>
      <CardHeader className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <CardTitle className="text-base">Control and validation catalog</CardTitle>
          <div role="tablist" aria-label="Catalog type" className="flex flex-wrap gap-2">
            <TabButton
              active={activeTab === 'validation'}
              count={filteredCatalog.validationRules.length}
              label="Validation Rules"
              onClick={() => setActiveTab('validation')}
            />
            <TabButton
              active={activeTab === 'exceptions'}
              count={filteredCatalog.controlExceptions.length}
              label="Control Exceptions"
              onClick={() => setActiveTab('exceptions')}
            />
          </div>
        </div>
        <p className="text-muted-foreground text-xs">
          Read-only C8 seed projection. Linked severity/default/evidence on validation rules comes
          from the mapped CTRL-EX item when one exists.
        </p>
      </CardHeader>
      <CardContent>
        {activeTab === 'validation' ? (
          <ValidationRulesTable catalog={filteredCatalog} exceptionsByCode={exceptionsByCode} />
        ) : (
          <ControlExceptionsTable catalog={filteredCatalog} />
        )}
      </CardContent>
    </Card>
  );
}
