import { useMemo, useState, type ReactNode } from 'react';

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
  ValidationRuleCatalogItem,
} from '@modules/ControlValidationCatalog/Domain/Entities/ControlValidationCatalog';
import {
  controlActionAllowedLabel,
  controlCategoryLabel,
} from '@modules/ControlValidationCatalog/Domain/Constants/ControlValidationCatalogDisplayText';
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
    <div className="text-muted-foreground rounded-md border py-8 text-center text-sm">Không có bản ghi danh mục nào khớp bộ lọc hiện tại.</div>
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

function FieldLine({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="min-w-0 space-y-0.5">
      <dt className="text-muted-foreground text-xs">{label}</dt>
      <dd className="min-w-0 break-words text-sm">{children}</dd>
    </div>
  );
}

function normalizeExceptionCode(controlExceptionCode: string | null | undefined) {
  return controlExceptionCode?.trim() ?? '';
}

function findLinkedException(
  controlExceptionCode: string | null | undefined,
  exceptionsByCode: Map<string, ControlExceptionCatalogItem>,
) {
  const normalizedCode = normalizeExceptionCode(controlExceptionCode);
  return normalizedCode ? exceptionsByCode.get(normalizedCode) : undefined;
}

function LinkedExceptionFallback({ controlExceptionCode }: { controlExceptionCode: string | null | undefined }) {
  const normalizedCode = normalizeExceptionCode(controlExceptionCode);

  if (normalizedCode) {
    return (
      <span className="text-destructive break-all text-xs">
        Thiếu cấu hình {normalizedCode}
      </span>
    );
  }

  return <span className="text-muted-foreground">Không áp dụng</span>;
}

function ValidationRuleCard({
  item,
  linkedException,
}: {
  item: ValidationRuleCatalogItem;
  linkedException?: ControlExceptionCatalogItem;
}) {
  return (
    <article className="border-border bg-card text-card-foreground min-w-0 rounded-lg border p-3">
      <div className="min-w-0 space-y-1">
        <p className="break-all text-sm font-medium">{item.code}</p>
        <p className="text-muted-foreground break-words text-xs">{item.description}</p>
      </div>
      <dl className="mt-3 grid gap-3">
        <FieldLine label="Điều kiện kích hoạt">{item.trigger}</FieldLine>
        <FieldLine label="Mức độ">
          {linkedException ? (
            <ControlSeverityBadge severity={linkedException.severity} />
          ) : (
            <LinkedExceptionFallback controlExceptionCode={item.controlExceptionCode} />
          )}
        </FieldLine>
        <FieldLine label="Trạng thái mặc định">
          {linkedException ? (
            <ControlDefaultStateBadge state={linkedException.defaultState} />
          ) : (
            <LinkedExceptionFallback controlExceptionCode={item.controlExceptionCode} />
          )}
        </FieldLine>
        <FieldLine label="Bằng chứng">
          {linkedException ? (
            <BooleanRequirement value={linkedException.evidenceRequired} label={`${item.code} bằng chứng`} />
          ) : (
            <LinkedExceptionFallback controlExceptionCode={item.controlExceptionCode} />
          )}
        </FieldLine>
        <FieldLine label="Module sở hữu">{item.ownerModule}</FieldLine>
        <FieldLine label="Trạng thái">
          <CatalogImplementationStatusBadge status={item.implementationStatus} />
        </FieldLine>
      </dl>
    </article>
  );
}

function ControlExceptionCard({ item }: { item: ControlExceptionCatalogItem }) {
  return (
    <article className="border-border bg-card text-card-foreground min-w-0 rounded-lg border p-3">
      <div className="min-w-0 space-y-1">
        <p className="break-all text-sm font-medium">{item.code}</p>
        <p className="text-muted-foreground break-words text-xs">{item.scenario}</p>
      </div>
      <dl className="mt-3 grid gap-3">
        <FieldLine label="Nhóm">{controlCategoryLabel(item.category)}</FieldLine>
        <FieldLine label="Mức độ">
          <ControlSeverityBadge severity={item.severity} />
        </FieldLine>
        <FieldLine label="Trạng thái mặc định">
          <ControlDefaultStateBadge state={item.defaultState} />
        </FieldLine>
        <FieldLine label="Bằng chứng">
          <BooleanRequirement value={item.evidenceRequired} label={`${item.code} bằng chứng`} />
        </FieldLine>
        <FieldLine label="Hành động được phép">{controlActionAllowedLabel(item.actionAllowed)}</FieldLine>
        <FieldLine label="Trạng thái">
          <CatalogImplementationStatusBadge status={item.implementationStatus} />
        </FieldLine>
      </dl>
    </article>
  );
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
    <div className="min-w-0">
      <div className="hidden overflow-x-auto md:block">
        <Table className="min-w-[1040px]">
          <TableHeader>
            <TableRow>
              <TableHead>Mã</TableHead>
              <TableHead>Mô tả</TableHead>
              <TableHead>Điều kiện kích hoạt</TableHead>
              <TableHead>Mức độ</TableHead>
              <TableHead>Trạng thái mặc định</TableHead>
              <TableHead>Bằng chứng</TableHead>
              <TableHead>Module sở hữu</TableHead>
              <TableHead>Trạng thái</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {catalog.validationRules.map((item) => {
              const linkedException = findLinkedException(item.controlExceptionCode, exceptionsByCode);
              return (
                <TableRow key={item.code}>
                  <TableCell className="max-w-36 whitespace-normal break-all font-medium">{item.code}</TableCell>
                  <TableCell className="min-w-[240px] whitespace-normal break-words">{item.description}</TableCell>
                  <TableCell className="text-muted-foreground min-w-[180px] whitespace-normal break-words text-xs">
                    {item.trigger}
                  </TableCell>
                  <TableCell>
                    {linkedException ? (
                      <ControlSeverityBadge severity={linkedException.severity} />
                    ) : (
                      <LinkedExceptionFallback controlExceptionCode={item.controlExceptionCode} />
                    )}
                  </TableCell>
                  <TableCell>
                    {linkedException ? (
                      <ControlDefaultStateBadge state={linkedException.defaultState} />
                    ) : (
                      <LinkedExceptionFallback controlExceptionCode={item.controlExceptionCode} />
                    )}
                  </TableCell>
                  <TableCell>
                    {linkedException ? (
                      <BooleanRequirement
                        value={linkedException.evidenceRequired}
                        label={`${item.code} bằng chứng`}
                      />
                    ) : (
                      <LinkedExceptionFallback controlExceptionCode={item.controlExceptionCode} />
                    )}
                  </TableCell>
                  <TableCell className="max-w-32 whitespace-normal break-words text-xs">{item.ownerModule}</TableCell>
                  <TableCell>
                    <CatalogImplementationStatusBadge status={item.implementationStatus} />
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
      <div className="grid gap-3 md:hidden">
        {catalog.validationRules.map((item) => (
          <ValidationRuleCard
            key={item.code}
            item={item}
            linkedException={findLinkedException(item.controlExceptionCode, exceptionsByCode)}
          />
        ))}
      </div>
    </div>
  );
}

function ControlExceptionsTable({ catalog }: { catalog: ControlValidationCatalog }) {
  if (catalog.controlExceptions.length === 0) {
    return <EmptyFilterResult />;
  }

  return (
    <div className="min-w-0">
      <div className="hidden overflow-x-auto md:block">
        <Table className="min-w-[980px]">
          <TableHeader>
            <TableRow>
              <TableHead>Mã</TableHead>
              <TableHead>Kịch bản</TableHead>
              <TableHead>Nhóm</TableHead>
              <TableHead>Mức độ</TableHead>
              <TableHead>Trạng thái mặc định</TableHead>
              <TableHead>Bằng chứng</TableHead>
              <TableHead>Hành động được phép</TableHead>
              <TableHead>Trạng thái</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {catalog.controlExceptions.map((item) => (
              <TableRow key={item.code}>
                <TableCell className="max-w-36 whitespace-normal break-all font-medium">{item.code}</TableCell>
                <TableCell className="min-w-[240px] whitespace-normal break-words">{item.scenario}</TableCell>
                <TableCell className="text-muted-foreground max-w-32 whitespace-normal break-words text-xs">
                  {controlCategoryLabel(item.category)}
                </TableCell>
                <TableCell>
                  <ControlSeverityBadge severity={item.severity} />
                </TableCell>
                <TableCell>
                  <ControlDefaultStateBadge state={item.defaultState} />
                </TableCell>
                <TableCell>
                  <BooleanRequirement value={item.evidenceRequired} label={`${item.code} bằng chứng`} />
                </TableCell>
                <TableCell className="max-w-40 whitespace-normal break-words text-xs">
                  {controlActionAllowedLabel(item.actionAllowed)}
                </TableCell>
                <TableCell>
                  <CatalogImplementationStatusBadge status={item.implementationStatus} />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      <div className="grid gap-3 md:hidden">
        {catalog.controlExceptions.map((item) => (
          <ControlExceptionCard key={item.code} item={item} />
        ))}
      </div>
    </div>
  );
}

export function ControlValidationCatalogTables({
  catalog,
  filteredCatalog,
}: ControlValidationCatalogTablesProps) {
  const [activeTab, setActiveTab] = useState<CatalogTab>('validation');
  const exceptionsByCode = useMemo(
    () => new Map(catalog.controlExceptions.map((item) => [normalizeExceptionCode(item.code), item])),
    [catalog.controlExceptions],
  );

  return (
    <Card>
      <CardHeader className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <CardTitle className="text-base">Danh mục kiểm soát và xác thực</CardTitle>
          <div role="tablist" aria-label="Loại danh mục" className="flex flex-wrap gap-2">
            <TabButton
              active={activeTab === 'validation'}
              count={filteredCatalog.validationRules.length}
              label="Quy tắc xác thực"
              onClick={() => setActiveTab('validation')}
            />
            <TabButton
              active={activeTab === 'exceptions'}
              count={filteredCatalog.controlExceptions.length}
              label="Ngoại lệ kiểm soát"
              onClick={() => setActiveTab('exceptions')}
            />
          </div>
        </div>
        <p className="text-muted-foreground text-xs">
          Bản chiếu chỉ đọc từ dữ liệu khởi tạo C8. Mức độ, trạng thái mặc định và bằng chứng liên kết trên
          quy tắc xác thực được lấy từ CTRL-EX tương ứng khi có cấu hình.
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
