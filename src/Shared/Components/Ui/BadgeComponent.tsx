import * as React from 'react';
import type { VariantProps } from 'class-variance-authority';

import { cn } from '@shared/Utils/Cn';
import { badgeVariants } from '@shared/Components/Ui/BadgeVariants';

function Badge({
  className,
  variant,
  ...props
}: React.ComponentProps<'span'> & VariantProps<typeof badgeVariants>) {
  return <span data-slot="badge" className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export { Badge };
