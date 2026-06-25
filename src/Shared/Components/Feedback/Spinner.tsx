import { Loader2 } from 'lucide-react';

import { cn } from '@shared/Utils/Cn';

/** Inline loading indicator used for buttons, tables, and route fallbacks. */
export function Spinner({ className }: { className?: string }) {
  return <Loader2 className={cn('size-4 animate-spin', className)} aria-label="Đang tải" />;
}

export function PageSpinner() {
  return (
    <div className="flex h-full min-h-64 w-full items-center justify-center">
      <Spinner className="size-6 text-muted-foreground" />
    </div>
  );
}
